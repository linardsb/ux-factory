# Implementation Report — Spring motion foundation (#165)

**Plan**: `.claude/plans/spring-motion-foundation-165.md`   **Branch**: `feature/spring-motion-165`   **Status**: COMPLETE

## Summary

Site-wide motion upgrade with zero at-rest change: the three existing spring `linear()` easing
tokens (`--motion-ease-spring/-bounce/-settle`) are now applied to every hover/press/disclosure
transition that still ran on plain `ease`, the dock panel disclosure was converted from a
keyframe entrance to a transition + `@starting-style` + `allow-discrete` (gaining a real exit
animation), and entrance-only `@starting-style` reveals were added to the /build keep rail and
the dock restore row. No tokens added, no JS changed, no literals introduced.

## Tasks completed

- Task 1: branch + drift-clean start → `feature/spring-motion-165` off `origin/main` (380c6cf); both generators printed `✓`, zero drift (worktree `ux-factory-wt-165`, per the parallel-sessions convention — the main dir holds #167's branch)
- Task 2: spring sweep → `system/components.css` (UPDATE: `.btn-arrow::after` spring, `.nav-toggle .bar` bounce, `.nav-panel` settle, `.lp-proof` spring, `.lp-faq .faq-mark` icon-morph bounce)
- Task 3: spring sweep + redundant-override removal → `system/portfolio.css` (UPDATE: `.lineup-item .go`, `.cs-acc .mark`, `.to-top`, `.peak-ethics-choice`; I7 transition override removed)
- Task 4: tokenize + spring the touched literals → `system/proto.css` (UPDATE: `.ot-notes`, `.ot-btn`, `.ot-switch::after`, `.ot-sheet`, `.ot-toast`; pure color/border lines left as-is)
- Task 5: dock panel `@starting-style` conversion + restore-row entrance → `system/portfolio.css` (UPDATE: keyframe deleted, transition + `@starting-style` + `display … allow-discrete`; `.dock-restore-row` entrance-only settle)
- Task 6: keep-rail entrance → `build.html` (UPDATE: attribute-selector entrance in the inline style block; no `display` leg — the #138 `[hidden]` guard stays instant on exit)
- Task 7: reduced-motion closure → verification only, as the plan predicted (global kill-switch `portfolio.css:16-23` covers IA + /build; `proto.css:672-675` reduce block already lists all five touched selectors)
- Task 8: cross-engine check → scratchpad `check-springs.mjs` (NOT committed, per plan)

## Tests added

No suite exists (repo convention). Verification:

- **Cross-engine script** (chromium + firefox + webkit, Playwright 1.61 from `tooling/visual-regression/node_modules`): **24/24 pass** —
  computed `transitionTimingFunction` contains `linear(` on `.card` (work.html) and `.btn-arrow::after` (home);
  dock `@starting-style` entrance runs (`getAnimations() == 2` on all three engines; webkit also reports
  `transition-behavior: … allow-discrete` computed, so full modern behavior); dock exit reaches `display:none`;
  `reducedMotion:'reduce'` context opens the dock with 0.01ms durations; /build keep rail becomes visible after
  seeding with settle `linear()` timing.
- **`node tooling/build-checks.mjs`**: all 10 groups green.
- **`node tooling/build-journey.mjs all`**: **125/125 per engine, 3 engines green** (extra insurance beyond the
  plan's ladder, since build.html and the dock were touched — covers dock mid-flow, reduced-motion, share
  round-trip, console cleanliness).

## Validation results

- Level 1 (drift): `gen-token-css.mjs` + `gen-handoff.mjs` re-run after all edits → `git status system/ handoff/` shows only the hand-edited CSS files. PASS (AC #3).
- Level 2: build-checks 10/10 groups. PASS.
- Level 3: cross-engine script 24/24 across 3 engines. PASS (AC #2, AC #4).
- Level 4 (manual eyeball): covered functionally by the script + build-journey; no OS-level manual pass performed in this autonomous run.
- Level 5 (CI, the arbiter for AC #1): pending on the PR — `verify` + `visual` must be green with zero baseline files in the diff.

## Deviations from the plan

1. **Worktree instead of `git checkout main` in the shared dir** — the main working dir sits on
   `feature/param-count-167` (a parallel session's branch); per the repo's parallel-sessions
   convention the work went into a fresh `ux-factory-wt-165` worktree branched off `origin/main`.
   Same commit graph result as the plan's Task 1.
2. **I7 `.btn-arrow` override: only the transition rule removed** — the plan said remove the whole
   `:1854-1858` block, but the block's second rule (`.btn-arrow:hover::after { translateX(6px) }`)
   is a hover *distance* override (6px vs the base 4px), not made redundant by Task 2. Removing it
   would have changed hover behavior beyond the ticket. The comment was trimmed to explain what remains.
3. **Task-8 script: `.card` asserted on work.html, not home** — home's only `.card`s are the
   `#reskin-preview` specimen cards whose transition is deliberately overridden by the
   `is-animated` crossfade rule (`portfolio.css:1252`); a first draft asserting home's cards
   failed honestly on firefox/webkit and passed on chromium only via a race with the crossfade
   arming. The sweep itself was never wrong — the check subject was.
4. **Dock restore row entrance added** (plan Phase 3 names it; Open Question 3 called it optional) —
   trivial one-pattern addition, entrance-only, same rationale as the keep rail.
5. **`build-journey.mjs all` run beyond the plan's validation ladder** — cheap insurance for the
   build.html + dock edits; all green.

## Issues encountered

- Fresh worktree needed `npm ci` in `tooling/style-dictionary` and `tooling/visual-regression`
  (known from repo memory) before `gen-handoff.mjs` would run.
- Open Question 2 (untracked epic docs): committed with this PR as the plan assumed —
  `docs/epics/prototyping-feel-uplift.{prd,architecture}.md` are the epic's governing docs and this
  is the epic's first ticket. Flagged here for the owner to confirm.
