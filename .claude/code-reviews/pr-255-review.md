# PR #255 Review — studio compiled screens fit their slots (#251)

**PR**: https://github.com/linardsb/ux-factory/pull/255 · `main` ← `feature/studio-compiled-screens-overflow-251`
**Reviewed**: the full diff (8 files, +1016/−8), the five changed source files in full, the plan +
implementation report (documented deviations honored), against CLAUDE.md's standards.
**Reviewer**: fresh-context `code-reviewer` agent (this is a self-review session — the deep pass ran
in a clean context; verdict posted as a comment, not a formal approval, per solo-repo convention).

## Summary

The fix is minimal and root-caused: one attribute-keyed CSS variable override for the compiled-slot
growth, the `ds-list-row` narrow-container amendment at the primitive, a visible fallback scrollbar,
and the carry-across-swap hazard closed through one exposed existing closure plus a two-state guard.
Red-first discipline held for all three new journey rows. One Medium finding (a vacuous conjunct in
the new carry case) — **fixed in this PR** with a mutation proof. One Low logged as follow-up.

## Findings

### M1 — Medium — the carry case's "node at origin" conjunct was vacuous — **FIXED**

`tooling/studio-journey.mjs` (the `#251 · a live sticky carry…` case) — the gesture never moved
before the compile, so `origin === current` from pick-up and the at-origin assertion held whether or
not `cancel()`'s restore line (`applySlot(g.node, g.origin)`, studio-verbs.mjs:534) ever ran. Only
the gesture-void and no-`.is-picked` conjuncts were load-bearing. The exact `check-that-cannot-fail`
class this repo's discipline exists for.

**Resolution**: the case now presses ArrowDown after pick-up and *waits for the displacement to be
real* (`data-row` observed to change) before compiling — the restore is now the only way back to
origin. **Mutation-proven**: with `applySlot(g.node, g.origin)` deleted, the case goes red on
exactly the origin conjunct (`{col:1,row:2}` vs origin `{col:1,row:1}`) while 5 pre-existing
cancel-dependent cases redden alongside it (collateral confirmation the line is well-covered);
restored, chromium runs 321/0.

### L1 — Low — Fit floors out in the compiled state — **LOGGED, not fixed here**

At `data-compile-state="rendered"` the sizer grows to ≈3952px against `.stx-scroll`'s 640px cap, so
Fit pins at the 0.5 floor and can no longer frame the whole canvas. Pre-existing graceful
degradation (group 12 covers `fitLevel`'s floor), no journey row exercises Fit-while-compiled.
Worth a follow-up assertion — natural home: #217's canvas-affordances pass or the #223 re-judge.

## Explicitly checked and cleared

- **aria-live collision** (cancel's sentence wins over settle's when a carry was live) — a written,
  deliberate trade in the plan; not an issue.
- **`verbs` in scope when `onState` first fires** — `mountCanvasVerbs` never returns null and
  `onState` fires only from `settle()`, never at mount (`setState("blocks")` bypasses it).
- **Two `.stf-screen` rule blocks** — equal specificity, disjoint property sets; no cascade hazard.
- **`overflow-wrap: anywhere` vs grid intrinsic sizing** — /build's grid consumers use fixed
  `minmax()` minima, so min-content contributions are never consulted; also covered empirically by
  the zero-churn VR run.
- No inline styles, no literal colours, no `view-transition-name`, no new bus verb/consumer
  anywhere in the diff.

## Validation

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | all 20 groups pass (fresh, on the PR checkout) |
| `node agent-layer/gen-system-graph.mjs --check` | no drift |
| `node agent-layer/gen-loc-summary.mjs` | no drift on the rebased tree |
| `node tooling/studio-journey.mjs all` (pre-M1-fix tree) | chromium 321/0 · firefox 317/0 · webkit 317/0 |
| `node tooling/studio-journey.mjs all` (post-M1-fix) | strengthened case green ×3 (chromium 321/0 · firefox 317/0 · webkit 317/0). One run's chromium frame check caught a single 50.6ms LoAF (threshold: zero ≥50ms, under 4× CDP throttle) in a pass this PR doesn't touch — 0.6ms over, on content that passed the same check five other times this session incl. an immediate clean re-run; recorded as a borderline-throttle flake, not shrugged silently |
| `node tooling/vt-verify.mjs` | green ×3 — compile opens zero transitions, reduced motion included |
| VR zero-churn | proven — update:docker in a detached worktree, 20/20 pass, zero PNGs changed |

## What's good

Root-caused, not patched: the size claim is one CSS rule on the existing state-attribute seam, and
the one new hazard it opens is closed at the orchestrator's existing coordination point. The 480px
value is measured with stated headroom (426/428/429 across engines + 51px), the fallback scroller
story is rewritten honestly in the sheet's own header, and the plan's GOTCHA callouts (aria-live
ordering, don't touch `--stx-slot-w`, no per-move geometry reads) anticipated exactly the failure
modes a reviewer hunts for.

## Recommendation

**APPROVE** (advisory — self-review session, so posted as a comment for the human's final call).
No Critical/High. M1 fixed in-PR with its mutation proof; L1 logged. Validation green across every
gate the repo owns.

---

## Resolution (2026-08-10)

The review's "M1 — FIXED in this PR" did not survive the merge: #255 was merged before the fix
hunk was pushed (the `owner-merges-fast` race, second occurrence after PR #126/#131), so main's
`9d43b72` carries the vacuous conjunct and the review file itself was left uncommitted. Both land
in the follow-up PR from `fix/studio-251-pr255-review`.

- **M1 — landed.** The authoring session's 8-line flowPass hunk, applied verbatim onto main: the
  carry case presses ArrowDown after pick-up and WAITS for `data-row` to change before compiling,
  so cancel()'s restore (`applySlot(g.node, g.origin)`, studio-verbs.mjs:534) is the only way back
  to origin. Mutation re-proven on the merged tree by the landing session: with the restore line
  deleted, chromium fails 5 — the carry case red on exactly the origin conjunct (`{1,2}` vs
  `{1,1}`, the displaced cell) plus 4 pre-existing cancel-dependent cases as collateral; restored,
  chromium 324/0 · firefox 320/0 · webkit 320/0.
- **L1 — logged durably.** The Fit-while-compiled assertion is now recorded on its named natural
  home: issue #217 (canvas-affordances pass), comment of 2026-08-10.

Re-validated on the fix branch: loc-summary no drift on the staged tree · studio-journey green ×3
engines (counts above; the driver-only change touches no shipped module, so the wider battery
stands as run for #255).
