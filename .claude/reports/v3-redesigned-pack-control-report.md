# Implementation Report — P2d Redesigned pack control (#76)

**Plan**: `.claude/plans/v3-redesigned-pack-control.md`   **Branch**: `feature/v3-pack-control` (worktree `../ux-factory-wt-76`, branched off `origin/main`)   **Status**: COMPLETE

## Summary

The v2 side dock is rebuilt as the one persistent utility of the v3 site: a control that states its purpose, offers the three committed packs plus the visitor's own derived "your brand" pack, and carries that pick across all eight pages. A non-numbered `#beat-wear` interstitial on Home introduces it, so it is no longer an unexplained widget. The shared `pack-derived.mjs` seam gains the pre-wear backup #74 chartered to this ticket and a same-tab change event, and one `selectPack()` state machine now arbitrates the committed-stylesheet and inline-custom-property mechanisms that previously only coexisted last-write-wins.

## Tasks completed

- Pre-wear backup in `wear()`/`unwear()` + `PREWEAR_KEY` → `system/pack-derived.mjs` (UPDATE)
- Same-tab `BRAND_CHANGE_EVENT` emitted from `writeRecord`/`clearRecord`/`wear`/`unwear` → `system/pack-derived.mjs` (UPDATE)
- `motion-icon-morph` (220ms) in both `motion` groups → `system/tokens.source.json` (UPDATE)
- Unified `selectPack()` state machine, derived-aware ground truth, conditional "your brand" row, reset-to-neutral, morphing glyph, derived-aware copy-tokens → `system/dock.mjs` (UPDATE)
- Panel redesigned to the v3 craft bar + glyph morph rule + interstitial styles → `system/portfolio.css` (UPDATE)
- `#beat-wear` interstitial between `#beat-brand` and `#beat-peak` → `index.html` (UPDATE)
- Full regen chain → `system/tokens.contract.css`, `system/tokens.neutral.css`, `system/loc-summary.json`, `system/system-graph.json`, `handoff/verdant/*` (GENERATED)

`system/pack-boot.js` is untouched — `git diff origin/main -- system/pack-boot.js` is empty, so the committed-pack branch and the VR-critical no-op default are byte-identical.

## Tests added

No unit-test suite exists in this repo (CLAUDE.md: "no suite, no linter, no type-check"), so "done" is the gates plus running the surface. The integration test is a Playwright script driving the real page in all three engines — `scratchpad/verify-76.mjs`, deliberately not committed (it needs a served repo and a local Playwright install; the repo has no test harness to host it).

13 checks × 3 engines (Chromium / Firefox / WebKit) — **39/39 pass**:

1. Disclosure opens, glyph morph transition-duration resolves to the token's 220ms
2. Committed pack switch re-points the one stylesheet line and persists
3. A colour entered in `#beat-brand` grows the fourth row live, with the honest label
4. Selecting "your brand" rides the **neutral** base and backs up the displaced pick
5. `unwear()` hands the pre-wear pack back (the #74 fix)
6. Reset returns to neutral, keeps the record, the row stays offered
7. Wearing derived then picking verdant leaves no ghost inline colours
8. Cross-page persistence to `/work.html` (pack-boot pre-paint)
9. Interstitial sits between beats 02 and 03, carries no numeral, affordance opens the control
10. Below 1100px: rail hidden, affordance hidden, copy still honest, no horizontal scroll
11. Console clean on a fresh `/`
12. Reduced motion: morph and disclosure land instantly

## Validation results

| Gate | Result |
|---|---|
| `node --check system/dock.mjs` · `system/pack-derived.mjs` | pass |
| `tokens.source.json` JSON parse | pass |
| `node tooling/token-lint.mjs` | **pass** — 64 contract tokens, 0 undeclared, 0 orphan, DTCG valid (`icon-morph` consumed) |
| `node tooling/drift-check.mjs` (clean tree, post-commit) | **exit 0** — syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| Cross-engine functional walkthrough | **39/39** in Chromium, Firefox, WebKit |
| Visual regression | **deferred** — see below |

## Deviations from the plan

1. **Ground truth for "derived is selected" needs the selector as well as `:root`.** The plan says the radio reflects live state. Reflecting `:root` alone was implemented first and produced a real bug caught in the cross-engine run: after entering a colour in `#beat-brand` without wearing it, the record's colours are on `:root` while the base is still saulera, so the dock marked "your brand" as already checked — clicking it fired no `change` event and the reader could never reach the honest neutral base. `groundTruth()` now requires the selector to say `derived` **and** the record's colours to be the ones on `:root`. Both halves are load-bearing and commented as such (`system/dock.mjs`).

2. **All mutation happens inside the view-transition callback, and a same-href swap is never awaited.** The plan's wording ("`clearRoot` MUST run BEFORE a line-swap") is right about DOM order but would capture an already-stripped "from" frame, showing a neutral flash mid-crossfade. Separately, `neutral → your brand` re-points the link to the href it already holds; re-assigning `href` does not re-fire `load`, so awaiting it would hang the transition. Both are handled explicitly in `selectPack`'s `swap()`.

3. **`clearRoot` is gated on the record existing, not on the selector being `derived`.** The plan's edge-case list only covers "derived *worn* → select verdant". A colour entered without wearing sits on `:root` with the selector still on a committed pack; a selector-gated clear would leave it ghosting. `removeProperty` on an unset key is a no-op, so the unconditional clear is safe.

4. **Copy-tokens copies the derived custom properties when "your brand" is worn.** Not in the plan, but making derived selectable from this control turned the existing button into a false claim: it copies the committed sheet, which under a derived pack is only the neutral base. It now copies a labelled `:root { --color-*: … }` block instead. In scope because #76 is what created the mismatch.

5. **The view transition's promises are caught.** Firefox surfaced `InvalidStateError: Skipped ViewTransition due to document being hidden` as an unhandled rejection. `.ready` and `.finished` are now swallowed, mirroring `spine.mjs:186`. Pre-existing on the committed path; fixed because this ticket rewrites that code and the check asserts a clean console.

6. **Honest-label copy follows #74's proven phrasing** — `derived here, not Northwind's official design system` rather than the plan's literal `not an official <label> design system`, matching `pack-derived.mjs:150` and reading correctly with and without a name.

7. **Panel title uses `--type-h3`.** The plan implied a step below `h3`; there is no `--type-h4` token, and inventing one for a single panel is not worth a contract addition.

8. **`#beat-brand`'s label can go stale in one edge case.** Enter a colour without wearing it, then pick a committed pack in the dock: the inline colours are cleared (correctly), but the beat's own label still reads "Your colour is on the stage". Fixing that means reaching into #74's merged `wireBeatBrand()`, which the plan scopes out (the event contract is dock-listens-to-beat, one direction). Flagged rather than fixed.

9. **One pre-existing em dash removed** from the verdant pack note in `dock.mjs`, since the redesign is held to the CHECKLIST's humanizer rule and that string was being rewritten anyway.

## Issues encountered

- **VR baselines deferred, deliberately.** The control renders at the 1280px capture width, so all 16 baselines churn, and `#beat-wear` plus the `loc-summary` runtime-group flip (10200 → 10400 lines, rendered by approach.html) churn index and approach on top. VR is D11-frozen non-blocking on `feature/v3-*` (job-level `continue-on-error`, so the run is green and the check is red — mergeState will read UNSTABLE, not CLEAN), and `#82` owns the authoritative full regen and the re-block. Regenerating here would cost a Docker run for baselines `#82` overwrites. **Not run: `cd tooling/visual-regression && npm run update:docker`.**
- **Built in a separate worktree.** The main working directory sits on `feature/v3-approach-work`, a pushed open-PR branch with 44 staged files from a parallel session. `../ux-factory-wt-76` was created off `origin/main` (which already carries #74 and #75) so neither ticket contaminates the other.
- **Fresh worktree needed `npm ci` in `tooling/style-dictionary`** before `gen-handoff.mjs` would run (known: `local-agent-visual-gate-notes`).
- **Two console messages are expected, not regressions**: `ERR_CONNECTION_REFUSED` to the absent local Worker on `/work.html` (fixture degradation), and a 404 for `/fonts/fonts.css`, which the saulera pack `@import`s and this repo does not ship — documented verbatim at `tooling/visual-regression/visual.spec.mjs:54`.

## Ready for the next step

Committed as `b4c6eaa` on `feature/v3-pack-control`. Next: `piv-create-pr`, then `piv-review-pr`.
