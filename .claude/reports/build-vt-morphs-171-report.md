# Implementation Report — /build View Transition morphs + inspect mount + copy cut (#171)

**Plan**: `.claude/plans/build-vt-morphs-171.md`  **Branch**: `feature/build-vt-morphs-171`  **Status**: COMPLETE

## Summary

/build's three interaction-driven state changes now morph through a shared `system/morph.mjs`
wrapper: the two wizards' Back/Next, the breadboard's edit verbs, and the pattern stage when the
board names a different pattern. The inspect engine mounts on the page's real components — including
the `ds-*` primitives the board builds at runtime, via a new non-destructive `refreshInspect()`
re-scan — and every static lead was rewritten so no section opens with an unexplained term.

**The spike answered the opposite of what the plan predicted.** The plan's premise was that
`view-transition-name` "has ZERO render effect at rest". It has zero effect on what an element
*paints*, but it makes that element a **stacking context**, which changed /build's at-rest pixels:
the breadboard's SVG connection lines were re-stacked behind the place cards. See §Spike.

## Tasks completed

| Task | File | |
|---|---|---|
| the shared VT wrapper | `system/morph.mjs` | CREATE |
| family 1 · wizard step progression | `system/build-questions.mjs` | UPDATE |
| family 2 · breadboard edit verbs + per-place group names | `system/breadboard.mjs` | UPDATE |
| family 3 · identity-key morph, inspect tagging, re-scan hook | `system/pattern-render.mjs` | UPDATE |
| VT names/classes + spring easing + the stacking fix + inspect mounts, toggle, script tag + copy cut | `build.html` | UPDATE |
| `refreshInspect()` + the M3 `dismissedTrigger` fix | `system/inspect.mjs` | UPDATE |
| inspect-toggle control entry | `system/param-manifest.json` | UPDATE |
| regenerated counts | `system/param-count.json` (72→73), `system/loc-summary.json` | UPDATE |
| vetting invariant extended to direct `.style.x =` writes | `tooling/build-checks.mjs` | UPDATE |
| journey check [16b] — inspect wiring, re-wiring, and M3 | `tooling/build-journey.mjs` | UPDATE |
| cross-engine proof the morphs actually open | `tooling/vt-verify.mjs` | CREATE |
| the stacking-hazard audit (written for #172) | `tooling/vt-stack-audit.mjs` | CREATE |
| the breadboard overlay's z-index — the spike fix | `build.html` | UPDATE |
| architecture-map entry for the new driver | `CLAUDE.md` | UPDATE |
| the 4 churned baselines | `tooling/visual-regression/baselines/` | UPDATE |

`system/build-keep.mjs` was **not** modified — the plan's decision, and it held.

## Tests added

**`tooling/vt-verify.mjs` (new, operator-run, 3 engines).** The gap it closes: build-checks and
build-journey only assert END STATES, and `morph()` deliberately falls through to a plain mutation
whenever it cannot transition — so a morph that silently stopped firing leaves every other assertion
green. It wraps `document.startViewTransition` before any module evaluates and reads
`getAnimations()` for the running `::view-transition-*` pseudos.

Green on **chromium 149.0.7827.55, firefox 151.0, webkit 26.5** — all three run the real morph path:
boot opens 0 transitions · each family opens exactly 1 with the names we wrote (`bx-q-<act>`,
`bb-place-<id>`, `bx-pattern`) · a rename opens 0 · reduced motion opens 0 while the interaction
still completes.

**`tooling/build-journey.mjs` [16b]** — inspect toggles on, a rendered tile opens the bubble with its
token rows, the stage re-renders, a *freshly built* tile still opens it (proves `refreshInspect`),
and the M3 Esc semantics hold. 141 assertions/engine (was 125).

**Mutation-tested** (the "check that cannot fail" rule — every new check was made to fail on purpose):

| Mutation | Result |
|---|---|
| direct `.style.x =` write in pattern-render | ✗ fires (this hole was **unchecked before this PR**) |
| `viewTransitionName` write outside breadboard | ✗ fires |
| drop the `refreshInspect()` call | ✗ fires |
| revert the M3 fix | ✗ fires — **only after two false greens**, see below |
| remove the breadboard overlay's z-index | ✗ `vt-stack-audit` reports 4 unresolved overlaps |

## Validation results

| Gate | Result |
|---|---|
| `node tooling/build-checks.mjs` | ✓ all 10 groups |
| `node tooling/drift-check.mjs` | ✓ all 11 checks |
| `node agent-layer/gen-param-count.mjs --check` / `gen-loc-summary.mjs --check` | ✓ no drift |
| `node tooling/build-journey.mjs all` | ✓ 141/engine (chromium, firefox, webkit) |
| `node tooling/vt-verify.mjs all` | ✓ 3 engines |
| VR Stage A (`update:docker`) | ✓ 20 passed, **exactly 4** PNGs changed |
| VR Stage B (plain gated run) | ✓ 20 passed |
| VR isolation run (VT layer stripped, old baselines) | ✓ 20 passed — the real zero-pixel proof |
| `node tooling/vt-stack-audit.mjs` | ✓ 6 states, no layout shift, every overlap z-indexed |

## SPIKE — findings for #172

**(a) Was Stage B green first try? Yes — and that was misleading.** Stage A regenerates /build's
baseline *from the same tree*, so it cheerfully baked a real visual regression into the baseline and
Stage B passed against it. **The two-stage protocol as written cannot detect an at-rest change that
the VT layer itself causes.** What caught it: strip *only* the VT layer (the CSS block + the inline
name write) and re-run against baselines captured **with** it. #172 should treat that isolation run
as the gate, not Stage B.

**(b) `view-transition-name` is NOT render-inert at rest.** It is inert in what an element *paints*;
it is not inert in how it *stacks*. A named element forms a **stacking context**. `.bx-bb-lines`
(the breadboard's SVG overlay) had been winning on being the only `position:absolute` element in the
canvas while the places are static grid items — so the lines and their dots drew over the cards.
Naming each place promoted it into the same paint step, and the places come *after* the overlay in
source order, so every connection line was covered and clipped to the gutter. Fix: one explicit
`z-index: 1` on the overlay, a no-op wherever no name is applied.
**#172 must audit every element it names for an overlapping positioned sibling or descendant** — and
`tooling/vt-stack-audit.mjs` is that audit, committed here so #172 can point it at any page.

**The audit's result on /build, across six states the pixel gate never captures** (default board ·
feed · onboarding · connect mode · a derived pack on the stage · a board emptied to zero places):

- *Hazard A (containing block)* — **clean in every state.** Nothing moves when every name is removed,
  so no named element became the containing block for a positioned descendant. The tool asks the
  engine which elements are animating rather than re-sampling, because the hero's `breathe` pill is on
  a 3s loop and a sample-based calibration called it a layout shift in 2 of 6 states.
- *Hazard B (paint order)* — **clean after the fix.** At most 7 overlaps in any state, every one of
  them decided by an explicit z-index (`skip-link` 100 · `site-header` 50 · dock `ruler` 40 ·
  `bx-bb-lines` 1). Removing the z-index again makes the audit report 4 unresolved `z-index: auto`
  overlaps — so the check provably fires on the bug it was written for.
- **`bx-pattern` and both `bx-q-*` names appear in ZERO overlaps in every state**, so the two names
  besides the places are genuinely inert here.

**(c) The mechanism finding still holds, and is the reason the gate is safe.** The VR gate performs
zero interactions (load → resize fixpoint → screenshot), and `vt-verify` proves empirically on all
three engines that **boot opens zero transitions**. So an interaction-driven `startViewTransition`
can never run during capture. #172 must keep every wrapper interaction-driven and must never morph on
restore or boot. Playwright 1.61's `animations:'disabled'` was **never observed engaging with a view
transition**, because no transition ever existed during a capture — so its behaviour toward
`::view-transition-*` remains untested and #172 should not rely on it either way.

**(d) Baseline cascade, as predicted: exactly 4 PNGs.** build ×2 (copy cut + the inspect toggle) and
approach ×2 (it is the only consumer of `param-count.json` and `loc-summary.json`; the total moved
72→73 and the line counts moved with `morph.mjs` + `vt-verify.mjs`). The other 16 were byte-identical.
`tooling/` is not counted by `gen-loc-summary`, so committing the new driver cost no further churn.

## Deviations from the plan

1. **`composition.length`, not `composition.children.length`** (plan §identity key). `compose()`
   returns an array (`slots.map(...)`, pattern-render.mjs:47-60); the plan's shape would have been
   `undefined` for every pattern, collapsing every key to `pat:<id>:undefined` and disabling family 3.
2. **No separate `ref:${id}` refusal key.** Whether `renderComposition` throws is decided by the
   vocabulary and the composition's shape, which `pat:${id}:${length}` already names — a refusal key
   could only ever agree with it. Four literals, not five.
3. **`render()` split into `plan()` / `paint()` / `render()`** — not cosmetic, it fixes a real bug the
   plan's shape introduced. `morph()` hands the callback to `startViewTransition`, which runs it a
   frame later; in that gap a second render can paint a newer state synchronously (both the
   re-entrancy guard and the unchanged-key path paint straight through), and the older captured
   closure then overwrote it. Observed as journey [4] flaking back to a queue after the feed rendered.
   `paint()` now re-plans from `readBuild()`, so every paint is idempotent and self-healing.
4. **The wizard card's VT name and the places' `view-transition-class` moved from JS to CSS.**
   build-checks group 7 refuses a second inline-style write on this page, and it was right to: a
   per-act constant and a class constant belong in the stylesheet. Only the per-place *name* is
   genuinely dynamic, and it is now the one whitelisted exception.
5. **build-checks group 7 extended** (not in the plan) to count direct `.style.x =` assignments, which
   it never checked — it only matched `.setProperty(`. Without this, adding the names by direct
   assignment would have slipped past the invariant entirely. Both branches mutation-tested.
6. **`tooling/vt-verify.mjs` added** (not in the plan). The plan called for a manual cross-engine pass;
   a manual pass is not repeatable evidence, and #172 consumes this spike's findings. Costs no
   baseline churn.
7. **`z-index: 1` on `.bx-bb-lines`** (not in the plan) — the spike finding above, plus
   **`tooling/vt-stack-audit.mjs`** (not in the plan) to prove the finding is the only instance on
   this page and to hand #172 the check rather than only the warning.
8. **Act 03's heading changed** ("Places, affordances, and the lines between them." → "The screens,
   what you can do on each, and where they lead."). The plan asked for the plain sentence to come
   first; the heading was the jargon. Shape Up's three definitions are quoted verbatim, as that
   section's own comment requires.
9. **The M3 fix is included** (the plan flagged it as droppable). It is the defect PR #180's review
   said "must not survive into the first two-trigger page", and /build is that page. Flagged in the
   PR body as an inherited-defect fix.
10. **The `?b=` restore path was left unwrapped** and pattern-render's vocabulary-loading branch writes
    no key — both as planned. This is load-bearing for the pixel gate and is now commented as such.

## Issues encountered

- **Two false greens on the M3 check.** It passed under a mutation that reverted the fix — twice. The
  pointer was being parked at viewport (2,2), which `site.js` tags as an inspect mount (the header);
  `body{overflow-x:clip}` means the header is not sticky, so whether that corner is a trigger depends
  on scroll position. With it hovered, `armHide` bails and the rearm path under test never runs. The
  second attempt aimed at a heading whose box sat at y≈43 — *underneath* the overlaying header — so a
  DOM-level `closest()` check said "clear" while the pointer was on a mount. `park()` now asks the
  page what is actually under each candidate coordinate and returns whether anything carrying a mount
  is still `:hover`, so it proves its own postcondition.
- **`build-journey all` is intermittently flaky, and it is pre-existing.** Runs failed at [4c] and at
  the late analytics checks on firefox/webkit under the sequential three-engine run. Confirmed against
  a clean `origin/main` worktree, which flaked the same way with none of this ticket's code. Each
  engine passes 3/3 run individually.
- **Firefox needed the journey's "opens" assertions hardened.** Playwright's `hover()` scrolls, and
  scrolling correctly dismisses the bubble (WCAG 1.4.13), so the bubble opened and closed a frame
  later. Firefox failed as "11 token rows present, not visible" — a populated-then-dismissed bubble.
  The assertions now check both halves (the engine records *this* element as described, and the bubble
  is on screen) and retry.

## Acceptance criteria

- [x] AC1 — morphs on all three families in all three engines, proven by `vt-verify`; reduced motion
      opens none; renames open none.
- [x] AC2 — VR green; only the 4 predicted baselines changed; the isolation run proves the VT layer
      adds zero at-rest pixels **after** the stacking fix.
- [x] AC3 — build-checks 10/10; build-journey 141/engine × 3.
- [x] AC4 — no section opens with an unexplained term; every rewritten line through /no-ai-slop +
      /humanizer.
- [x] AC5 — `[data-pattern-stage="ready"]` still a `waitVisible` handle; no waitReady handle touched.
- [x] SPIKE — findings recorded above and in the PR body, addressed to #172.
- [x] param-manifest entry + regenerated param-count/loc-summary in the same PR.
- [ ] PR body carries `Closes #171` — pending `piv-create-pr`.
