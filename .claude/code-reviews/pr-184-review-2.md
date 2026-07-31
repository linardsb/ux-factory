# PR #184 Re-review — review fixes verified (#169)

**Verdict: APPROVE** — all three findings from `pr-184-review.md` (REQUEST CHANGES) are correctly fixed in `a4d4941`; the subsequent `origin/main` merge (`4d28bb9`, post-#183) did not touch the fixed regions; no new issues. Reviewed fresh-eyes in a clean detached worktree at the PR tip (`4d28bb9`), deep pass dispatched to the code-reviewer agent.

## Prior findings

**H1 (High) — nested `data-inspect` mounts steal keyboard focus's bubble: FIXED.**
`system/inspect.mjs` now guards both `focusin` and `focusout` with `ownEvent = (t, e) => e.target.closest("[data-inspect]") === t` — a mount acts only when the focused element's nearest mount is itself. Traced adversarially: nested→nested focus shows only the inner mount's bubble; focus moving from a nested button to a non-mount element inside the ancestor correctly hands over to the ancestor's own `focusin`; Shift-Tab is symmetric (guard depends only on `e.target`); no path leaves `focusTrigger` stale for `armHide` to re-show an unfocused trigger's bubble. Proven by the author's cross-engine script (chromium + firefox + webkit, 21/21) including new tab-onto-nested-button assertions, and **mutation-checked**: with the guard reverted, 4 assertions fail with exactly the reviewed symptom (Cards/hero role shown on button focus).

**L1 (Low) — stale rAF from a prior drag: FIXED.** `system/scrub.mjs` `pointerdown` cancels any pending `requestAnimationFrame` before reading `base`, exactly as prescribed; `raf`/`pending` bookkeeping otherwise unchanged.

**L2 (Low) — hue no-wrap at 0/360: DOCUMENTED (accepted).** A comment at the hue mount records the deliberate bounded-slider choice (one keyboard model across the three rows, honest `aria-valuemin/max`) — the "wrap it or note the choice" option the review offered.

## Merge commit check

`git diff a4d4941 4d28bb9 -- system/inspect.mjs system/scrub.mjs`: the only change is #183's unrelated `export const getInspect = () => current;` read handle, outside `wireTriggers`/`show`/`hide`/`armHide`; `scrub.mjs` has zero diff. Nothing clobbered.

## Validation (at the PR tip, clean worktree)

| Check | Result |
|---|---|
| `gen-inspect-data --check` | ✓ 14 components, no drift |
| `gen-param-count --check` | ✓ 69 controls, no drift |
| `gen-loc-summary --check` | ✓ 3 groups, no drift |
| `tooling/drift-check.mjs` | ✓ all 11 groups (after `npm ci` in style-dictionary — fresh-worktree dep, not drift) |
| `tooling/build-checks.mjs` | ✓ all 10 groups |
| CI (`verify` + `visual`) | ✓ both green on `4d28bb9` |

## Recommendation

**Approve.** Findings closed, fixes proven by a test that demonstrably fails without them, tree and CI green. Posted as a comment per solo-repo convention (author cannot formally approve own PR); a human makes the merge call.
