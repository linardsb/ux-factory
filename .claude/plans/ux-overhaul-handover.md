# UX overhaul — handover (2026-07-22)

State: **PR #68 is MERGED to main** (owner merged it mid-session; the token-lint CI fix landed just after the merge and was cherry-picked straight onto main as `008c558` — main is green, the feature branch is deleted). **Round 2 starts from main.** Follow-up work is tracked as **issue #69** (round 2: live hero · component library grid · scale contrast · study preview stacking · handoff chrome · toggle pill). Owner verdict after round one: "a little better, but nowhere near where it should be." This doc is the full context for the next session to push it further.

GitHub housekeeping done this session: 18 merged remote branches deleted (kept `feature/portability-proofs` — reserved for the pending FIGMA_TOKEN parity run — and `feature/pack-seed-derivation-vision-run`, which is not ancestry-merged); self-review posted on #68. CI note: the `verify` gate failed twice post-token-change — (1) `gen-pack-bundle.mjs` must be rerun with `gen-handoff.mjs` on ANY token change, and (2) `tooling/token-lint.mjs` orphan check: a token consumed only from JS needs the `getPropertyValue` pattern (lint now scans `system/*.mjs` for both `var(--…)` and `getPropertyValue("--…")`). Full local pre-push check: `node tooling/drift-check.mjs && node tooling/token-lint.mjs`.

## The brief (owner's words, condensed)

The portfolio was "extremely confusing, badly done UX/UI, no clear indication of what anything is for, data scattered across all pages, walls of copy, visual hazard everywhere; no one will hire the person who built this." Requirements given during the session:

- Emulate https://kinetics.colorion.co/#library — spring-physics motion, one card = one thing, live previews, progressive disclosure.
- The hiring-manager question flow (the 4-question wizard) must be front and centre: answer questions, watch the process build UI/UX.
- Copy: humanizer rules, "no filler bullshit words, no cliches, no AI slop", shorter and more precise everywhere.
- Accessibility is a first-class requirement ("people impairments").
- Layout must be WOW — "get inspiration from UX masterpieces, no boring layouts, but still UX/UI in mind"; stand out from any UX/UI product designer's portfolio.

## What was done (the 4 commits on the PR)

1. **b93b4a5 — copy + bento Home.** Site-wide plain-language rewrite (no em dashes, no negative-parallelism/aphorism headlines, no codenames — PIV, "Wright", "route is reserved" all gone). Home hero: "Answer four questions. Watch a design system get built." + bento grid (large factory tile with a static mini preview of question 1, re-skin tile with 3 pack swatches, results tile, claims strip) + contact band in the body. Approach cut ~1,450→~810 words; the 5×4 loop table replaced with the `.lineup` numbered stepper; decision cards cut 5→4. Work leads with "Two demos you can run right now." Hover-only `.verify-proof` reveal deleted — content visible at rest (touch/AT honesty). New CSS: `.bento`, `.mini-q`, `.mini-packs`, `.bento-strip` in `system/portfolio.css`.
2. **97885c6 — Factory restructure + `/roundtrip`.** Factory ~15,000px → ~6,200px at rest. Sticky station rail (5 chips + 2 dashed exhibit chips, IntersectionObserver scroll-spy, `aria-current`). Two-column "stage": `#intake` (wizard in `.fw-sticky`, sticky top 130px) beside `#generation` (live `#reskin-preview` + new `#factory-summary` 4-cell stat strip + evidence in `<details class="cs-acc factory-acc">`). Round-trip compact on-page (diff collapsed) with full evidence moved to new `roundtrip.html` (cloned handoff-shell discipline, full site chrome). Prototype iframes capped (phone 720px / board 780px, scroll inside). Trace player + system graph inside closed disclosures. `factory-intake.mjs` gained null-guarded `renderSummary()` (`#factory-summary`, ~25 lines; instance.html unaffected). Hash-opens-ancestor-details helper + `html { scroll-padding-top: 130px }` (keyboard focus never lands under sticky chrome). VR spec: factory drops `#roundtrip-player` wait (moved page), `/roundtrip` added as gated page → 18 baselines.
3. **c7cf564 — spring motion.** Five new tokens in BOTH groups of `system/tokens.source.json` (regen `gen-token-css.mjs` + `gen-handoff.mjs`): `motion-bounce` 300ms, `motion-settle` 520ms, `motion-count` 900ms, `motion-ease-bounce` (~13% overshoot linear() spring — touch only, never entrances), `motion-ease-settle` (critically damped). Press-squish on `.btn`/`.dock-toggle`/`.to-top` (`:active` scale, release through bounce). `dock-panel-in` → spring; ethics `fw-pop` → bounce. Nav pill-glide: `.nav-links a.active { view-transition-name: nav-active }`. New `system/motion.mjs` (`countUp`/`countUpOnVisible`; last frame writes the measured string verbatim — honesty contract; instant under reduced motion) wired to: approach loc numbers (spans), WCAG ratio cells on discrete renders only (never on colour-drag ticks), round-trip ΔE. WCAG pass-checks: inline SVG `check-draw` glyphs, staggered draw-in via `.fw-animate`, fully drawn at rest. Dock pack swap wrapped in `document.startViewTransition` (resolves on new sheet's load event; reduced-motion guarded). Zero at-rest change — gate passed with no baseline churn.
4. **a347bfc — study page.** `agentic-ui-study.html`: hero rewritten plainly; raw composition JSON behind a `details` (module change in `agentic-study.mjs`); five-pillar rubric inside a hidden-until-rendered `.cs-acc` disclosure (`#rubric-acc`); preview full-width; citations shortened; module hint copy de-jargoned. Page ~4,400→~3,200px.

## Hard constraints (recorded decisions — do NOT violate)

- Vanilla shipped pages: no framework, no build step, no animation libraries, no live LLM at view time.
- **Calm colours** (owner's own hard rule, 2026-07-19): monochrome + one blue; excitement via motion/craft, never colour. Kinetics' orange was deliberately not imported. If the next round wants more visual heat, that decision must be revisited *explicitly with the owner*, not drifted past.
- Honesty contract (PRD, hard): fictional labels, "real run, curated" labels, truthful capability chips — visible at rest, outside all disclosures, never as headlines.
- Motion values only from tokens; new tokens go into `tokens.source.json` → `node agent-layer/gen-token-css.mjs` (+ `gen-handoff.mjs` or the pack goes stale and CI's drift check blocks).
- Copy: humanizer rules (no em/en dashes in visible copy, no "not X but Y", no aphorisms, no -ing padding, active voice, plain words). Owner will reject AI-sounding text.
- Accessibility: no hover-only or colour-only information; keyboard paths everywhere; `prefers-reduced-motion` renders final states instantly; counted numbers are real text nodes.
- Site identity: public name "Linards Berzins", chrome stays neutral "ux factory", contact = gmail + GitHub only (no forms/LinkedIn — recorded decision).

## Operational traps (all hit this session — don't re-learn them)

- **VR gate**: any at-rest visual change ⇒ `cd tooling/visual-regression && npm run update:docker` in the same PR (needs Docker). 18 baselines = 9 pages × 2 packs; `/roundtrip` is now gated. The gate waits on `state:'attached'`, so engine mounts inside closed `<details>` are fine. Playwright's `toHaveScreenshot` auto-disables animations and waits for frame stability, so count-ups/entrances don't churn baselines.
- **`gen-loc-summary.mjs` counts only git-TRACKED files** — regen AFTER `git add`, or counts lag a commit and the approach baselines go stale silently (update:docker may skip sub-perceptual rewrites — `rm` the PNGs to force). Approach renders these numbers.
- Changing `tokens.source.json` or `components.css` ⇒ also regen `system-graph.json`; moving lines in `components.css`/`derive.mjs` ⇒ regen `annotated-source.json`. Final check: rerun all generators, `git status` must be clean.
- Sticky-in-grid: a sticky child needs its grid item to STRETCH (don't set `align-items:start`), else it stops at its own short section.
- Browser preview caching is aggressive — serve on a fresh port per iteration when screenshotting.
- Wizard/module mounts are `getElementById` — markup can be re-hosted freely as long as ids survive: `#factory-wizard #reskin-preview #factory-narrative #scenario-toggle #ethics-gate #fw-scenario-notice #handoff-note #factory-summary #agents-player #roundtrip-diff #system-graph` + `.factory-embed-figure[data-scenario]` pair.

## Known gaps / where the next round should push (owner says still not enough)

- **The WOW ceiling.** Current result is clean-editorial + tactile, but within calm-monochrome it reads restrained, not breathtaking. Ideas researched but NOT built: oversized background station numerals (scale contrast), magazine-style sticky chapter spines on Approach, a hero moment where the site visibly re-skins on first visit, Kinetics-style "library grid" treatment for the components themselves (each component as a live card with a hover/press demo — the strongest unexploited asset: the site HAS real components and a real vocabulary). The bento is one section on Home; the language could extend site-wide.
- **Hero sections are still static text.** No interactive hero. A live mini-derivation in the Home hero (type a colour, watch the hero re-skin) would be the single highest-wow move and is technically cheap (derive.mjs runs in-browser; scope tokens to a hero sample like `#reskin-preview` does).
- **Study page preview stacking**: the composed tiles render as a narrow vertical column inside the full-width dashed frame (pre-existing `.study-preview--insight-panel` max-width). Looks unbalanced now that the JSON column is gone.
- **`handoff.html` untouched**: no site chrome (header/footer), inconsistent with the rest. Was in the plan's phase 4, dropped for time.
- **Scenario-toggle sliding pill** (Kinetics tab-glide on the Verdant/Fieldwork switch) specced but not built — needs a persistent pseudo-element that survives the module's `replaceChildren`.
- **Contact page** is still nearly empty — deliberate (identity decision) but the owner may want it richer.
- The plan file with the full audit + specs: `.claude/plans/enchanted-snuggling-hejlsberg.md` (audit evidence, per-page findings, motion spec with paste-ready values, factory skeleton). Reference screenshots in the session scratchpad are gone after this session — re-screenshot with `python3 -m http.server` + agent-browser.

## Verification recipe

`npx serve .` (or python http.server) → click through Home / Approach / Factory (wizard end-to-end, both scenarios, open every disclosure) / Work / Contact / roundtrip / agentic-ui-study; toggle a pack from the dock (desktop ≥1100px); check reduced-motion; then `npm run update:docker` in `tooling/visual-regression` and rerun all `agent-layer/gen-*.mjs` until `git status` is clean.
