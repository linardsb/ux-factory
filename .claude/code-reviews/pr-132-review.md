# Code Review — PR #132 · The dock's Plus UI pack carries the design's full scale (#129)

**Branch**: `feat/plusui-full-scale-129` · **Reviewer**: agentic gate (fresh-context code-reviewer agent; verification by empirical reproduction, not inspection — the even-spread fill was recomputed by hand against the raw export for all four families and matched the committed diff index-for-index, including the dropped-value lists' order).

## Findings

1. **Low — addressed in the plan amendment.** Switching the committed pack's source from the API read to the plugin export replaced the header's specific file identity (`"Plus UI - FREE Figma UI Kit and Design System (2026) v2.0 (Community)" (key 1h9hLlYs6S9CO1xGyBcBVX)`) with the local export's name — a plugin export carries no file metadata a generated header could read, and hand-editing a generated artifact is forbidden. The trade-off is now recorded in the scales plan's AMENDMENTS with the kit's identity preserved on record; the reader-facing attribution lives in the dock note, which is unchanged and correct.
2. **Nitpick, no change**: the sentinel's unclassified entry carries an explanatory suffix while weight-exclusion entries appear bare — wording precision in the amendment only.

## Verified (empirically, not just plausibly)

- **Colours byte-identical** to `origin/main` — every `--color-*` line diffed clean; visitors see no hue change.
- **Every scale value real and traceable**: spacing 8-of-35 (indices 0,5,10,15,19,24,29,34 → 0…384px), radius 3-of-8 (0/8/24px), type 8-of-13 (128…12px), shadows 3-of-6 by weight — all recomputed and matched exactly; clamp() mins re-derived and matched; vw terms verbatim. As strong a "not hand-edited" proof as a no-test-suite generated-artifact repo allows.
- **Sentinel exclusion correctly scoped** (radius only, post-classification, pre-push, reported in the header) and its counterfactual verified: the 9999px value would indeed have landed on `radius-lg`.
- **API path unaffected, proven by a real re-run**: the cached-manifest regeneration reproduces the original colours-only pack byte-for-byte (the styles fallback emits colour entries only, so no dimension ever reaches the exclusion there).
- **No collateral obligations**: dock/pack-boot already allowlist plusui (unchanged); `system-graph` reads neutral/saulera/verdant only; loc-summary ✓; the VR matrix (neutral+saulera) never captures plusui.

## Recommendation

**Approve** — every functional claim reproduced under direct verification; the one Low finding is a documentation trade-off, now recorded. Ready for the human merge; closes #129.

*Solo-repo note: verdict posted as a comment — the human makes the final merge call.*
