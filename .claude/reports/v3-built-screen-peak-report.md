# Implementation Report — v3 built-screen peak (beat 3, #75)

**Plan**: `.claude/plans/v3-built-screen-peak.md`   **Branch**: `feature/v3-peak` (off `origin/main`)   **Status**: COMPLETE

## Summary
Made the v3 home spine's beat-3 peak live. On arrival, the `#beat-peak` static still is replaced by a real Verdant "Today" screen that the declarative renderer (`agentic-renderer.mjs`) builds from a committed example composition, re-skinned to the visitor's brand + answers by the real `derive()` engine. Real WCAG receipts draw from `derive().checks`; the Manipulation-Matrix verdict is a guess-then-reveal (canonical `facilitator`, humanized to "Genuinely useful"); and a restrained adjust-live control obeys a valid status change and refuses an out-of-vocabulary one, naming the exact path. Build-then-swap keeps the committed still as the no-JS / fail-closed final state. `/factory/built` fires once on the beat. No view-time LLM.

## Tasks completed
- Phase 0 gates — already resolved with owner in the plan's AMENDMENTS (2026-07-24); no new owner input needed.
- Motion token `motion-skeleton-to-content` (520ms, both groups) + full regen chain → `system/tokens.source.json`, `tokens.contract.css`, `tokens.neutral.css`, `system-graph.json`, `handoff/verdant/*` (UPDATE) — committed as `#75 P1`.
- EXAMPLE_COMPOSITION authored + validated against `vocabulary.json` under Node before any wiring → `system/peak.mjs` (CREATE).
- Inputs + `computeDerived` (brand from `readRecord`, axes from `getHomeAnswers`, fallbacks) → `system/peak.mjs`.
- Build-then-swap assembly (detached build → scoped re-skin → `.discrete-render` one-shot reveal) → `system/peak.mjs`.
- WCAG receipts from real `derive().checks` (headline over all 12, curated rows, honest fail-surfacing) → `system/peak.mjs`.
- Ethics guess-then-reveal with `QUADRANT_LABELS` (plain label + Eyal tag) → `system/peak.mjs`.
- Restrained adjust-live (one status select + non-destructive out-of-vocab probe) → `system/peak.mjs`.
- `trackFactoryBuilt()` with its own `builtFired` guard + `/factory/built` → `system/analytics.mjs` (UPDATE).
- `registerBeat("beat-peak", { effect, analytics, activateOn:"visible" })` → `system/peak.mjs`.
- Additive `onAnswers` seam + `getHomeAnswers()` → `system/factory-intake.mjs`, `system/intake-beat.mjs` (UPDATE).
- Script tag + `#beat-peak` region restructure + Gate-1b honest copy → `index.html` (UPDATE).
- Peak organisms consuming the motion token, entrance gated behind `.discrete-render` → `system/portfolio.css` (UPDATE).
- `loc-summary.json` regenerated after staging the new tracked `peak.mjs` (UPDATE).

## Tests added
No unit/integration suite in this repo (CLAUDE.md: "run the surface you touched"). Verification = throwaway Playwright drivers (scratchpad, not committed) + the drift/lint gates:
- **`validateComposition(vocab, EXAMPLE_COMPOSITION)`** under Node → `composition valid` (the one-pass gate, run before the render path).
- **Peak driver (19 assertions)** run in **Chromium, Firefox, and WebKit** → 19/19 each: assembly, all 5 `vd-*` components, receipts headline over 12 pairs with real ratios (14.18/5.19/5.23/4.80:1), `/factory/built` fired exactly once, ethics reveal ("Genuinely useful" + `facilitator` tag + wrong-guess correction), valid adjust re-renders, probe refuses with `composition[3].props.status: "urgent" is not in enum [ok | due | overdue]` non-destructively, zero console errors.
- **Edge cases (Chromium, 9/9)**: reduced-motion (assembles instantly, no `.discrete-render` gate), no-JS (still shown, honest copy, no "composed"), entered brand (screen wears the derived accent `#6d28d9`, differs from canned).
- **Headline ACs driven (Chromium, 7/7)**: fail-closed (abort the vocabulary fetch → still retained, no live screen, no blank mount, exactly one console.error, `/factory/built` suppressed); density end-to-end (set density=spacious in the intake **before** the peak activates → the built screen's `--spacing-md` = 20px vs comfortable's 16px — the Gate #2 payoff, not just the plumbing).
- **Shared-wizard regression (8/8)** on home + instance (the only wizard-mounting pages): `#reskin-preview` reaches `data-reskin="ready"` (run() ran through the new `onAnswers` line), no seam-related console errors.
- **Settled-state + responsive**: `:root`/`.peak-side` = neutral blue `#2563eb`, `.peak-screen--live` = brand green `#2f7a4d` (screen-only scoping confirmed); 360px = no horizontal overflow.

## Validation results
- `node --check` on all touched `.mjs` — pass. Node imports of `peak.mjs`/`analytics.mjs`/`intake-beat.mjs` clean (no DOM at import).
- `node tooling/drift-check.mjs` — **✓ clean** on the committed tree (syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces).
- `node tooling/token-lint.mjs` — **✓ clean** (63 tokens · 0 undeclared · 0 orphan · DTCG valid).
- Cross-engine functional — Chromium + Firefox + WebKit all 19/19.
- Craft/CHECKLIST self-audit — passed (a11y contrast via derive-guarantee + committed inverse tokens, focus-visible on every control, reduced-motion honored, no color-only info, compositor-only entrance ends at rest, min-width:0 on the wide refusal `<code>`, humanizer copy).

## Deviations from the plan
1. **EXAMPLE_COMPOSITION is a full Verdant "Today" screen, not the still's two summary tiles.** The plan said "echoing the still (3 plants need water / 12 healthy today)", but `stat-tile.kind` is enum-locked to moisture/light and its `value` is a number — it cannot express that summary copy. A vocabulary-valid Today screen (screen-header · 2 stat-tile · 2 care-task-row · plant-card · primary-button) is the honest and more impressive choice; validated under Node.
2. **Re-skin scope = the FULL derived token set, applied to `.peak-screen--live` only.** Task 5 said "color-* on the stage", but Task 13 + Gate #2 require density to visibly shift the screen (spacing/type), which color-only cannot do — a plan-internal contradiction. Resolved by applying the full set (mirroring `factory-intake.mjs`'s contained `previewRoot`), scoped to the screen (not the whole stage) so the `.peak-side` receipts keep the committed inverse tokens and stay legible under any entered brand (resolves the advisor's legibility concern). Verified: side stays neutral blue, screen wears the brand.
3. **Adjust-live = one status `<select>`** on the overdue care-task-row (valid enum re-renders; an "urgent" option fires the non-destructive probe). Restrained to one control per the "visually singular" discipline; the bus-log disclosure the plan floated as optional was dropped (it lives on `/agentic-ui-study`).
4. **Assembly = staggered content-settle, not a literal grey skeleton.** `motion-skeleton-to-content` drives a one-shot staggered rise+fade of the composed children (the `fw-step-in` idiom), gated behind `.discrete-render` and dropped before adjust re-renders (avoids the `entrance-anim-on-continuous-rebuild` trap). Chosen for 60fps + VR-safety over a literal skeleton phase.
5. **factory.html is a documented stub with no shared wizard.** The plan's regression target "factory.html + instance.html still initialise the wizard" rests on a wrong premise — only home + instance mount it. Regression verified on those two (8/8); factory.html has nothing to regress.
6. **Removed 5 em-dashes from visible copy** the first draft introduced (humanizer MUST), caught on screenshot review.
7. **`loc-summary.json` regenerated** (new tracked runtime file); **approach VR baselines NOT regenerated** — VR is `continue-on-error` on `feature/v3-*` (D11 freeze); the full baseline regen + re-block is #82's job.
8. **Token value 520ms** (plan suggested the ~480ms/`motion-slow` order) — a slightly more deliberate assembly, paired with `motion-ease-settle`.
9. **`/factory/built` fires from inside the effect on the successful build, not from the spine's `analytics` slot** (which the plan's Task 10 wired). The spine runs `analytics` after the effect whether or not the build succeeded, so a fallen-through build (reader on the still) would be counted as "reached the built screen" — contradicting the AC. Firing after the swap, with every fallback returning first, keeps the metric true. The difference is academic for a committed static vocab that ~never 404s, but it is the honest implementation and is now driven (fail-closed test confirms the event is suppressed on failure).

## Issues encountered
- Fresh worktree lacked `tooling/style-dictionary/node_modules` (needed by `gen-handoff`); installed once (memory `local-agent-visual-gate-notes`).
- Playwright at `~/node_modules` had version-mismatched Firefox/WebKit builds; installed the matching browsers.
- The derive engine negotiates **every** brand to pass AA (even pure yellow), so a receipt reading "Fails AA" is effectively unreachable through real input — the "all 12 pass" headline is honest, and the fail-surfacing code is correct defensive handling (verified by reading + the all-pass real render), not a live path.
- Screenshot timing trap: the #72 hero holds a canned-green `:root` re-skin for ~2.4s after load, so early screenshots of the below-fold peak show green chrome; the settled state is correct (neutral chrome, branded screen).

## VR posture (documented, not blocking here)
`index.html` at-rest state now assembles the live peak, so its committed baseline drifts — but the `visual` job is `continue-on-error` on `feature/v3-*` (D11), so it will not block the PR. Rest == final and entrances are `.discrete-render`-gated, so the state handed to #82 (full regen + re-block) is clean.

## Ready for the next step
All tasks complete; all validations pass; two commits on `feature/v3-peak` (`#75 P1` token + the feature). Next: `piv-create-pr`, then `piv-review-pr`. Note the VR-freeze posture in the PR body.
