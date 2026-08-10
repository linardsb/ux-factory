# Implementation Report — studio compiled screens fit their slots (#251)

**Plan**: `.claude/plans/studio-compiled-screens-overflow-251.md`
**Branch**: `feature/studio-compiled-screens-overflow-251` (stacked on `feature/studio-214-method-cards-hook-loop`, see Deviations)
**Status**: COMPLETE

## Summary

After Compile on /factory, every screen of the committed replay board now shows its whole content:
the compiled state grows the slot to 220×480 via one attribute-keyed CSS rule
(`.stx-viewport[data-compile-state="rendered"] { --stx-slot-h: 480px; }`), `ds-list-row` learned
narrow containers (shrinkable reading, wrapping value — the horizontal +12px defect is dead), the
fallback scroller that remains for oversize `?b=` boards got a visible token-styled scrollbar, and
the one hole the growth would open — a live sticky/keyboard carry spanning the swap with gesture
geometry cached from the 140px grid — is cancelled at the swap through the verbs' exposed `cancel()`
and a two-state guard in studio.mjs's `onState`. All three gate additions were written first and
observed red on the unfixed tree.

## Tasks completed

- Task 1 — the two #251 fit assertions (vertical + horizontal, per compiled screen of the committed
  board) → `tooling/studio-journey.mjs` (UPDATE, flowPass). **Observed red first**: Today Overview
  426/140, At-Risk Queue 258/140, Job Detail 285/140 + 232/220 horizontal, Reassignment
  Confirmation 270/140 — the plan's control table reproduced exactly.
- Task 2 — `ds-list-row` narrow-container behavior (`.ds-row-reading` → `flex: 0 1 auto; min-width: 0`;
  `.ds-row-value` → `min-width: 0; overflow-wrap: anywhere`) → `system/components.css` (UPDATE).
  Horizontal row went green; Job Detail content 285 → 310 (the value wraps — the plan's predicted trade).
- Task 3 — label bare-clip verified gone on the running page (scripted: no element extends past any
  screen's right edge; every clipped `.ds-row-name` carries its own ellipsis). Defect 3 confirmed a
  symptom of defect 2 — no extra CSS needed.
- Task 4 — compiled-state slot growth + scrollbar affordance + the honest header rewrite ("A SCREEN
  FITS ITS SLOT; SCROLLING IS THE BOUNDED FALLBACK") → `system/studio.css` (UPDATE). Both #251 rows
  green; revert-byte-identical row stays green.
- Task 5 — carry-across-swap cancel, case first → `tooling/studio-journey.mjs` (the sticky-carry-
  across-compile case, **observed red**: `gestureLive: true, picked: 1` on the unfixed tree), then
  `system/studio-verbs.mjs` (UPDATE: `cancel` exposed on `handleObj`, one line) +
  `system/studio.mjs` (UPDATE: the `onState` guard — cancel on `"rendered" | "blocks"` only). Green after.
- Task 6 — journey on all three engines → see Validation results.
- Task 7 — regen cascade: `gen-system-graph --check` no drift; `gen-loc-summary` regenerated —
  only the grand total flipped (34700 → 34800), the runtime group approach.html renders did NOT
  flip, so no approach baseline regen (memories `loc-summary-baseline-cascade`,
  `loc-summary-counts-tracked-only`).
- Task 8 — VR zero-churn proof from a clean detached worktree → see Validation results.
- Task 9 — overflow-board manual check (scripted, chromium + webkit): an oversize `?b=` board
  (6 places × 8 affordances) restores, compiles, all 6 screens overflow even 480 (worst 567px),
  the fallback scroller scrolls, `scrollbar-width: thin` + token `scrollbar-color` computed on the
  overflowing screens. Also proves plan assumption 4 (a `?b=` board CAN overflow 480).

## Tests added

All in `tooling/studio-journey.mjs` flowPass, each red-first on the unfixed tree (the mutation proof):

1. `#251 · every compiled screen of the committed board shows its whole content — no internal
   vertical scroll` (scrollHeight ≤ clientHeight per screen, both numbers printed every run)
2. `#251 · no compiled screen scrolls horizontally — the list-row value stays inside the screen`
   (scrollWidth ≤ clientWidth per screen)
3. `#251 · a live sticky carry is cancelled when the compile swap lands — gesture void, node at
   origin` (fresh page, sticky pick-up on the grab handle, Compile, then gesture === null +
   no `.is-picked` + origin col/row, read through the module's own `getVerbs()` seam)

## Validation results

- `node tooling/build-checks.mjs` — **all 20 groups pass** (groups 7/12/13/19 specifically re-verified
  by the run: no inline-style writes gained, caps/zoom mirror untouched, verbs' pure layer untouched).
- `node agent-layer/gen-system-graph.mjs --check` — **no drift** (64 tokens · 33 consumers · 393 edges).
- `node agent-layer/gen-loc-summary.mjs` — regenerated, grand total only (34700 → 34800).
- `node tooling/studio-journey.mjs chromium` — **321 passed, 0 failed** (fix-state run; the red-first
  runs before it: 318/2, then 319/1, then 320/1 for the Task 5 case).
- `node tooling/studio-journey.mjs all` — **green ×3**: chromium 321/0, firefox 317/0, webkit 317/0
  (the two fewer rows are the chromium-only frame check). All three #251 rows green on every
  engine; the INP budget rows (compile now reflows the grown grid) stay green.
- `node tooling/vt-verify.mjs` — **green ×3 engines**, factory samples included: load + replay +
  compile open zero transitions (the CSS variable flip is layout, proven not assumed), take-over,
  keep-rail clicks and the #214 method redraft all clean, reduced-motion branches included.
- VR zero-churn — **proven**: `update:docker` from a clean detached worktree under /Users with the
  branch's changes applied — 20/20 captures pass, `git status` on the baselines clean, zero PNGs
  changed. Compiled state is post-interaction (no baseline holds it) and the list-row change is
  inert in wide containers, now verified rather than reasoned.
- Edge case, compile at 2× zoom — screen renders 960px (480 CSS × scale), fits its slot, canvas
  scrolls, no page errors — the override composes with the zoom table by construction, spot-checked.
- Level 1 diff review — clean: no literal colours, no `view-transition-name`, no inline styles,
  no new bus verb (scripted scan over the staged diff + eyeball).

## Deviations from the plan

1. **Branched off the #214 tip instead of post-#214 main.** The plan's sequencing constraint said
   "implement after #214 lands"; its stated purpose was the shared-worktree hazard of #214's then-
   uncommitted work. At implementation time #214 was committed and pushed on
   `feature/studio-214-method-cards-hook-loop` (PR #252, open) and main had not moved — so #251 was
   branched off that tip (the exact tree the plan's anchors were read against, all anchors
   re-verified). The PR stacks on #252; when #252 merges, GitHub retargets the base to main.
2. **Task 9's manual checks were scripted where a script is honest** (overflow board, scrollbar
   properties, label clip) with screenshots captured for the eyeball. The real-Safari/Chrome-stable
   eyeball (memory `vr-gate-single-engine-blindspot`) remains for the owner — webkit/chromium
   engine coverage is done, real-browser is not.
3. Line anchors shifted vs the plan (#214's commits landed between plan and implementation) —
   e.g. the flow-screens block at studio.css:451 not :434, `mountCompile` at studio.mjs:456 not
   :424. Content matched everywhere; no plan-content deviation.

## Issues encountered

- The oversize-board script's hand-shaped `connections` were dropped by the share codec (my
  fixture's shape, not the page's bug) — the restored fat board compiled with 0 nav buttons. The
  check's claims (overflow, scrollbar affordance, scrolling) are unaffected; committed-flow nav
  coverage lives in the journey rows.
- None in the shipped code path.
