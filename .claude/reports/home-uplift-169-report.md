# Implementation Report — Wave 1: Home uplift (inspect mounts + scrub row + copy cut)

**Plan**: `.claude/plans/home-uplift-169.md`   **Branch**: `feature/home-uplift-169`   **Status**: COMPLETE

## Summary

Home now demonstrates the tool instead of describing it: the #166 inspect engine covers the
hero, the three sample cards, all four CTA/sample buttons and the injected header/footer chrome
(three new hand-authored role lines, regenerated into `inspect-data.json`); a new ~160-line
`system/scrub.mjs` renders three draggable/keyboard numbers under the intake stage — brand hue
re-runs the real `derive()` per change, radius and spacing set the contract's tokens directly on
`#reskin-preview`; and the flagged sections (wear, peak note, close takeaway, /build tier) now
open in plain English with the precise terms kept alongside. Springs swept (one real target),
the deferred inspect-bubble entrance landed, and the full regen cascade + 4 VR baselines are in.

## Tasks completed

- makeScrubbable primitive + home stage mount → `system/scrub.mjs` (CREATE)
- scrub container + script tag + 8 `data-inspect` mounts + 4 copy rewrites → `index.html` (UPDATE)
- scrub styles, five `@property` registrations + preview transition, bubble `@starting-style`
  entrance, `fw-row-in` → spring → `system/portfolio.css` (UPDATE)
- `page-hero` / `header` / `footer` ROLES lines → `agent-layer/gen-inspect-data.mjs` (UPDATE) + regen `system/inspect-data.json`
- chrome mounts → `system/site.js` (UPDATE)
- 4 entries (3 scrub + the #166 inspect toggle) → `system/param-manifest.json` (UPDATE) + regen
  `param-count.json` (62→66) and `loc-summary.json` (runtime 18100→18200)
- VR baselines: `index-neutral/saulera`, `approach-neutral/saulera` (UPDATE, rm-forced rewrite)

## Tests added

No suite exists (CLAUDE.md). Scratchpad cross-engine functional script (chromium + firefox +
webkit via the VR Playwright), 12 assertions per engine, **36/36 green**:
keyboard hue scrub advances `aria-valuenow` and changes the preview's `--color-accent`
(#2f7a4d→#187b59); pointer drag changes `--radius-md` (8px→18px); focus refreshes
`aria-valuenow` from the live computed value after an external overwrite (the wizard×scrub
edge case); inspect bubble opens on card hover with exactly 4 layers; Esc dismisses; toggle
survives reload; the JS-injected header mount opens; zero page errors; under
`reducedMotion: reduce` the scrub still works (snaps) and the bubble still opens.

## Validation results

- `node -e import('./system/scrub.mjs')` — node-safe ✓
- `node agent-layer/gen-inspect-data.mjs --check` · `gen-param-count --check` · `gen-loc-summary --check` — no drift ✓
- `node tooling/drift-check.mjs` — all 11 groups ✓ (run after EACH mount task, per plan)
- `node tooling/build-checks.mjs` — all 10 groups ✓
- VR: update run 20/20 ✓, exactly 4 PNGs churned (then approach ×2 recaptured after the
  loc re-sync — see Deviations); **two-stage @property proof**: `playwright test` (no update)
  at the registration commit against pre-registration baselines — 20/20 green, registrations
  machine-proven render-invisible.
- Approach page live-renders the new totals ("66 … live controls", runtime 18200) — verified
  in a driven browser, not just by the green gate.

## @property pre-flight (plan-required paste)

`--radius-md/lg`, `--spacing-sm/md/lg` across contract + neutral + saulera + verdant + legacy
`tokens.css`: all plain px except legacy `tokens.css` `--radius-md/lg: 0` (a bare `0` is a valid
`<length>`, and that file is a reference pack the shell never loads). **Extension beyond the
plan's grep list:** `tokens.plusui.css` (the dock's 4th pack, missing from the plan's command)
also checked — all px. `derive.rules.mjs` emits px for all five; `pack-import.mjs`'s `px()`
passes imported strings through **verbatim** (`1rem`, `50%`, …) → registration widened to
`syntax: "<length-percentage>"`, which is exactly the grammar the consuming CSS properties
accept, so registration rejects only values already invalid at point of use.

## Deviations from the plan

1. **Built in a fresh worktree** (`../ux-factory-wt-169`) instead of branching the main
   checkout — that checkout held #170's uncommitted work (shared-worktree memory).
2. **`@property` syntax is `<length-percentage>`, not `<length>`** — the plan's own
   pre-authorized widening, triggered by the pre-flight finding above.
3. **Hue scrub `read()`** reads the preview's computed `--color-accent` hue (plan's spec) while
   the rotation base is the brief's `brandColor` lightness/chroma; consistent because `derive()`
   preserves hue (verified in `derive.mjs` — only l/c are negotiated).
4. **Spring sweep outcome:** #165 had already covered every home transform/entrance except
   `fw-row-in` (the WCAG table's staggered row entrance) — moved to spring; all remaining
   plain-`ease` usages are colour/border/background fades, which the rule says stay. Recorded
   as the audit result the plan asked for.
5. **Copy glosses are parenthetical, not em-dashed** — the `/no-ai-slop` pass flagged the
   three-line em-dash appositive cluster; the plan allowed "bold or parenthetical".
6. **A fifth baseline event, explained:** the registration commit's 24 CSS lines flipped
   loc-summary's rounded runtime group (18100→18200), which approach renders — so after the
   two-stage proof the two approach baselines were recaptured (rm-forced) at the final tree in
   their own commit. Final PR churn is still exactly 4 distinct PNGs.
7. **Four commits instead of one** — required by the two-stage VR proof (pre-registration
   state must exist as a commit the Docker gate can run against).

## Issues encountered

- Port 4757 was held by the parallel #170 session's server — the first functional run silently
  tested the WRONG tree. Re-ran on a private port (4859).
- Test-side flakes, not product bugs: raw `mouse.*` doesn't scroll (handle was outside the
  viewport → no pointer events), and hover-that-scrolls races the engine's deliberate
  hide-on-scroll — fixed with scroll-settle-hover + retries in the scratch script.

## Ready for the next step

All validations green, tree clean, 5 commits on `feature/home-uplift-169`.
Next: `piv-create-pr` (body must carry `Closes #169`), then `piv-review-pr`.
