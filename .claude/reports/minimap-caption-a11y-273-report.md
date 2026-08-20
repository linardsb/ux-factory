# Report — #273: the minimap's keyboard affordance rides a visible caption via aria-describedby

## What shipped
- `system/studio-minimap.mjs` — header call 6 records the decision (the `#stx-move-help`
  caption idiom), the rejected alternative (`role="application"` — strips native reading
  semantics inside, a heavy hammer for one small widget) and the aria-label's fate (dropped,
  not shortened: a short name on a generic is the same formal violation; the visible h3 names
  the panel). `MAP_LABEL` → `MAP_HELP` (the affordance tail only); the map div wears
  `aria-describedby="stu-map-help"` and no `aria-label`; a visible
  `<p class="stu-map-help" id="stu-map-help">` is appended after the map and removed in
  `destroy()`. Mount-path only — the pure layer is untouched.
- `system/studio.css` — one `.stu-map-help` rule in the #221 minimap block, byte-matching
  `.stu-layers-help`'s declaration (tokens only; no new hand-mirrors; zero inline styles).
- `tooling/studio-journey.mjs` — one minimapPass row, the #219 resolving-IDREF shape: the
  caption exists, carries the affordance sentence, and is exactly what the map's
  `aria-describedby` names. Wiring only — no journey assertion can see SR output.
- `system/loc-summary.json` — regenerated; only the grand total flipped (38600 → 38700), no
  group number, so approach.html's rendered numbers are unchanged and its baselines stay put.

## Gates, observed
- `node tooling/build-checks.mjs` → **build ✓ all 27 groups pass** (the minimap group green
  and unedited; no timers, no inline styles added).
- Node-import safety: the module imports clean in Node, exports unchanged
  (`cellRect getMinimap jumpFrom mapView mountStudioMinimap trackOffsets visibleRange`).
- `studio-journey all` against a serve confirmed serving this tree (curl'd the module, the
  new id present): **chromium 518/1 · firefox 515/0 · webkit 515/0**; the #273 IDREF row
  passed on all three engines. The single chromium failure was the 4×-throttled frame
  check — one long-animation-frame of 53.3 ms against the 50 ms budget, recorded under
  three-engine parallel load. Chromium re-run alone on a quiet machine:
  **519 passed, 0 failed**, the frame check fully green (worst rAF gap ≤ 50 ms, zero LoAF)
  — load-induced flake, both results recorded per the repo's flake-vs-regression memory.
- VR baseline regen (`npm run update:docker` from the clean committed worktree):
  **22/22 passed**; exactly `factory-neutral.png` and `factory-saulera.png` rewritten,
  nothing else churned. The update run's own pass is the suite evidence. No approach
  countUp flake this run.

## Rebase (post-#274/#275/#276)
Main moved while the PR was open; rebased onto it. One conflict, `system/loc-summary.json`
(both sides regenerated it) — resolved by REGENERATION: took main's side to finish the rebase,
re-ran `gen-loc-summary` on the rebased tree, and the output was byte-identical to main's
(30,600 runtime / 38,500 total absorb the caption lines within rounding), so no loc-summary
change ships on this branch and approach stays put. `studio-journey.mjs` auto-merged (the #274
rows live in a different region). Post-rebase evidence: `build-checks` **27/27** and a
chromium journey pass **521 passed, 0 failed** with the #273 row green; the pre-rebase
three-engine result (firefox 515/0 · webkit 515/0) stands for the rest. The factory ×2
baselines remain as committed — the sibling session proved factory regenerates byte-identical
after #275's token drop, and the caption is the only factory-visible change here.

## Deviations
- One extra journey invocation: the first chromium-only re-run died at 263 assertions with
  `ERR_CONNECTION_REFUSED` because the background serve on 4763 was killed externally
  mid-run (parallel-session hazard the repo has a memory about). The serve was restarted,
  re-verified against this tree, and the re-run above is the counted result.
- None in the implementation: the change matched the plan file for file, wiring and scope.
