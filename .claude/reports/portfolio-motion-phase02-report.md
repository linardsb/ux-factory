# Implementation Report — Portfolio Motion Phase 2 (reveals + micro-interactions)

**Plan**: `.claude/plans/portfolio-motion-phase02.md`   **Branch**: `feature/portfolio-motion-phase02`   **Status**: COMPLETE

## Summary
Brought restrained, platform-native motion to the shipped IA pages entirely in token-only CSS — no
framework, no build step, no runtime JS. Five moves: (1) hero entrance cascade, (2) hero `.hl`
underline draw-in, (3) scroll-driven section-label + card-grid reveals, (4) full-card destination
links with a spring lift, (5) a distinguishing monochrome micro-glyph + hover-revealed proof line on
the three Home "ways to verify" cards. The motion token contract gained four values (`--motion-slow`,
`--motion-ease-spring`, `--motion-rise`, `--motion-stagger`) in both the contract and neutral groups.
Four of the five moves are churn-free by construction (gated behind `prefers-reduced-motion:
no-preference` and/or `@supports (animation-timeline: view())`, or hover-only); only move 5 changes
at-rest rendering, isolated as the final step with a reviewable two-baseline regen.

## Tasks completed
- Extend motion token contract → `system/tokens.source.json` (UPDATE, both motion groups) → regenerated `system/tokens.contract.css` + `system/tokens.neutral.css` (GENERATED)
- Hero entrance cascade (move 1) → `system/components.css` (UPDATE)
- `.hl` underline draw-in (move 2) → `system/portfolio.css` (UPDATE)
- Scroll reveals — labels + grids (moves 3 + 4-reveal) → `system/components.css` (UPDATE) + `stagger` class on `index.html`, `work.html`, `approach.html`
- Card lift retuned to spring (move 4) → `system/components.css` (UPDATE)
- 6 destination cards → full-card links → `index.html` + `work.html` (UPDATE)
- Home verify-card glyph + proof reveal (move 5) → `index.html` + `system/portfolio.css` (UPDATE)

## Tests added
None — this repo has no unit/integration suite (CLAUDE.md ground rule). The regression net is the
Playwright visual-regression gate, run **staged and inside Docker** (Linux, matching the committed
baselines) to avoid the macOS platform-antialiasing false-fail trap.

## Validation results
- **Token gen + drift** — `node agent-layer/gen-token-css.mjs && … --check`: PASS (exit 0; 55 contract + 63 pack tokens). The `linear()` spring string is emitted verbatim (generator never reads `$type`).
- **New tokens present** — `grep -c` in both generated layers: 4 / 4.
- **No new motion literals** — `grep -nE '[0-9]+ms|cubic-bezier|linear\('` on the component layers: components.css = 2, portfolio.css = 3 (both = the pre-existing baseline; ZERO added). `linear-gradient(` is correctly not matched by `linear\(`.
- **HTML well-formed** — index/work parse clean; 3 card-links + 3 glyphs + 3 proof lines on index, 3 card-links on work; 0 orphaned `</article>`, 0 nested anchors; all 3 glyphs valid XML.
- **VR STAGE 1** (Docker, after Phase 1 + moves 1–4, before move 5): **16/16 GREEN** — the empirical proof that the gating pattern held (no hidden start-state leaked into a base rule; THE #1 gotcha avoided).
- **VR STAGE 2** (Docker, after move 5): **2 failed (index-neutral, index-saulera) + 14 passed** — exactly the expected isolation. Delta = **+48px** page height on both packs (glyph 32px + `spacing-md` 16px per card row); the proof line added 0 height (correctly collapsed at rest via `grid-template-rows:0fr`). Diff image inspected: the entire hero region is byte-identical (moves 1+2 churn-free at rest); the only change is the glyph + the downward reflow it causes.
- **Baselines regenerated** — `npx playwright test --update-snapshots` in Docker → gate now 16/16. `git status` confirms **only** `index-neutral.png` + `index-saulera.png` changed (the other 14 re-rendered byte-identical). These two are the intended, isolated regen.
- **VR functional check** (Docker, `reducedMotion: no-preference`, throwaway spec, since removed): **PASS** — 3 card-links / 0 nested anchors; a scroll-revealed card settles to `opacity 1` / `translate 0px` (not stuck invisible); **reveal-then-hover lift = 2.00px** — gotcha #4 empirically ruled out, the reveal's `translate` composes with the hover `transform` rather than overriding it; proof line `grid-template-rows` = `0px` at rest → `20.8px` on hover (collapsed baseline, surfaced on interaction); **zero console errors**.
- **Level-5 surface** — `site.js`, `portfolio.js`, `factory.html`, `contact.html`, `404.html` all UNCHANGED. No new runtime JS.

## Acceptance criteria — evidence level per claim
The VR gate captures under `reducedMotion: reduce` + `animations: disabled`, so it proves **at-rest**
state only. Motion behaviour was closed separately by the functional Docker run and by construction.
Split honestly:

- **Verified by the VR gate (at-rest / baseline-safety):** AC #1 (tokens + drift), the rest-state
  halves of AC #3 (`.hl` border unchanged), AC #6 (cards render identical to the old `<article>`),
  AC #8 (isolated 2-baseline regen), AC #9 (nothing stuck invisible under `reduce` — all 16 green),
  AC #10 (no new literals, no new JS).
- **Functionally tested (headless, `no-preference`):** AC #6 motion (3 card-links, 0 nested anchors,
  reveal-then-hover **lift = 2.00px**), AC #7 (proof line collapsed `0px` at rest → `20.8px` on hover),
  and the reveal-settles-visible aspect of AC #4/#5/#9 (`opacity 1`, `translate 0` after scroll).
- **Verified by inspection / construction:** AC #2 hero child order (eyebrow→h1→sub→cta/cs-jump)
  confirmed on all six VR pages, and factory's intake wizard is a **sibling `<section>`** (not inside
  `.page-hero`) so the scoped `:is()` cascade cannot touch it; AC #7 keyboard path (`:focus-visible`
  shares the same declaration as the tested `:hover`); the move-5 reveal uses the plan's decided
  `grid-template-rows: 0fr→1fr` mechanism (hover-only, zeroed by the reduced-motion kill-switch) —
  required so the collapsed line takes 0 space at rest.
- **Outstanding — human Level-2 pass (aesthetic/temporal, a still frame can't judge):** the *feel* of
  the cascade timing, the underline sweep, and the spring settle (AC #2/#3/#4/#5 motion character), in
  Chrome + Firefox + Safari. All are additive under `no-preference` and cannot affect the proven-green
  at-rest baseline, so this is a polish check, not a correctness gate.

## Deviations from the plan
1. **Card-lift spring split (move 4).** The plan's primary instruction springs all three transitioned
   properties (transform/box-shadow/border-color); its own gotcha offers a calm fallback. I took the
   fallback: spring on `transform` + `box-shadow` (the physical lift settles), `border-color` stays on
   `--motion-ease`. Reason: the user's hard calm-colour constraint + a color-property spring is the
   likeliest thing to read as a "wobble," and it can't be eyeballed live headless. Zero-visual-risk,
   one-token-reversible tuning knob (plan Assumption #3); advisor concurred.
2. **Move-5 proof-line copy corrected for honesty (hard contract).** The plan's suggested card-1 line
   "5 stations · 1 live today" is FALSE — all five factory stations currently chip `capability live`
   "Runs now" (factory.html:242/267/324/362/378). Final lines, all verified true: card 1 **"Five
   stations · one pipeline"** (structural; avoids the false live-count), card 2 **"One file re-skins
   the site"** (matches the card's own claim), card 3 **"Two prototypes · one agentic study"**
   (`verdant.html` + `fieldwork.html` = 2; `agentic-ui-study.html` = 1). Copy is a review-time knob
   (plan Open Question #1) — flag if a different framing is wanted.
3. **Reworded one comment to keep the Level-1 grep clean.** The plan's suggested move-1 comment text
   contained the literal string "0ms" (explaining why NOT to write a `0ms` delay), which itself trips
   the no-literals grep → 3 matches in components.css, violating AC #10. Reworded to drop the
   substring; components.css is back to exactly 2 (the pre-existing `.nav-panel` toggles).

## Parity decision (plan Open Question #2)
Move 5 applied to **Home only** (the plan's default). Work's three cards get move 4 (link + spring
lift + scroll reveal) but no glyph — so only `index-*` baselines churn. Applying glyphs to Work too
would need two more bespoke glyphs and churn `work-*` as well. Flag if visual parity between the two
card sets is wanted.

## Branch / commit hygiene (for the next step)
- `feature/portfolio-motion-phase02` was branched off `feature/portfolio-motion-phase01` (Phase 0–1,
  commits `67092a8` + `a0f8e0c`), which is **unmerged and unpushed**. So `piv-create-pr` will detect
  base = `main` and the PR would show phases 0+1+2 combined unless phase01 merges to main first, or the
  PR is retargeted onto `feature/portfolio-motion-phase01`. Reversible at PR time.
- **Stage only the phase-02 set** (memory: stage by explicit path): `system/tokens.source.json`,
  `system/tokens.contract.css`, `system/tokens.neutral.css`, `system/components.css`,
  `system/portfolio.css`, `index.html`, `work.html`, `approach.html`,
  `tooling/visual-regression/baselines/index-neutral.png`,
  `tooling/visual-regression/baselines/index-saulera.png` (+ this report + the plan doc if desired).
  The other dirty `.claude/` files (`portfolio-ux-uplift.md`, `piv-plan-implementation/SKILL.md`,
  untracked `pr-45/46-review.md`, `five-pillar-rubric-hooks.md`) pre-date this work — do NOT fold them
  into the phase-02 commit.

## Issues encountered
None blocking. The macOS/Linux VR-baseline trap (local `npm test` would fail all 16 on platform
antialiasing, not churn) was sidestepped by running both gate stages and the regen inside the pinned
Playwright Docker image — so STAGE-1-green is a valid proof, not an artifact.

## Remaining human check (polish, not correctness)
The interactive *mechanics* were driven headless and pass (see functional check above). What a still
frame / automation cannot judge is the **temporal feel** — cascade timing, underline sweep, spring
settle, "does it read calm." Recommend a brief Level-2 pass in Chrome + Firefox + Safari to tune the
spring overshoot / stagger cadence to taste. This is additive under `no-preference` and cannot affect
the proven-green at-rest baseline, so it gates polish, not the merge.
