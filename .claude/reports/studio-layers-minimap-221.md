# Implementation Report — Studio 19: layers list + minimap (#221)

**Plan**: `.claude/plans/studio-layers-minimap-221.md`   **Branch**: `feature/studio-layers-minimap-221`   **Status**: COMPLETE

## Summary

Two new hand-written-canon modules give the /factory studio the two affordances every professional
canvas tool has: `system/studio-layers.mjs` (every placed thing — board wrappers AND the two device
frames — as a keyboard-navigable list in the inspector rail, selection wired through the ONE
`applySelection`) and `system/studio-minimap.mjs` (the whole 12×8 stage as an SVG with a live
viewport rect tracking pan and zoom, click-to-jump + arrow keys). Both are reflections of the live
DOM through rAF-coalesced observers, write zero inline styles (the minimap's geometry is SVG
presentation attributes — the #219 spans-not-px forcing function, third application), use no
`position: sticky`, and add no bus verbs.

## Tasks completed

- Task 1–2 · layers pure layer + mount → `system/studio-layers.mjs` (CREATE)
- Task 3–4 · minimap pure layer + mount → `system/studio-minimap.mjs` (CREATE)
- Task 5 · two mount nodes + hook comments → `factory.html` (UPDATE); token-only blocks → `system/studio.css` (UPDATE)
- Task 6 · orchestrator mounts both, `layers`/`minimap` on the live handle → `system/studio.mjs` (UPDATE)
- Task 7 · group 7 MODULES + groups **26/27** (see deviations) + header index → `tooling/build-checks.mjs` (UPDATE)
- Task 8 · `layersPass` + `minimapPass`, stale-serve guard re-pointed at `studio-layers.mjs`, bounds log + success sentence trued up → `tooling/studio-journey.mjs` (UPDATE)
- Task 9 · two INP rows (`layers-row toggle`, `minimap jump`) between #219's and #214's pairs → `tooling/studio-journey.mjs` (UPDATE)
- Task 10 · two `/factory` entries → `system/param-manifest.json` (UPDATE); regenerated `system/param-count.json` (118 → 120, /factory 44 → 46)
- Task 11 · regenerated `system/loc-summary.json` (runtime 75 → 77 files); CLAUDE.md — two module entries, build-checks paragraph (25 → 27 groups, both new groups described), studio-journey paragraph ("sixteen rows" → twenty-six + the two passes) (UPDATE)
- Task 12 · VR baselines regenerated via `update:docker`: factory ×2 rewrote on the first run;
  approach ×2 needed the `rm`-then-rerun force (the digit-level change sits under the rewrite
  threshold — the `vr-update-skips-subperceptual` memory, met again). Docker TEST run against the
  new baselines: 22/22 green.
- Task 13 · full sweep + commit + PR (this report rides in it)

## Tests added

- build-checks **group 26** (layers pure): order preservation, the three sentence shapes (1×1 slot,
  spanning frame, 1×1 frame), `selectable` false exactly for frames + unknown-kind default, the
  one-junk-row-among-good-ones mutation, totality, `toggleId` both directions with the
  mutate-and-re-derive isolation proof.
- build-checks **group 27** (minimap pure): `mapView` in three sole-detector conditions, far-edge
  clamp, junk pinned to the honest whole view, `jumpFrom` centering + both clamps, `trackOffsets`'
  gap rule, `cellRect` 2×3 = union of six 1×1s, `visibleRange` round-trip + edge-kissing refusal,
  totality, and the no-timer source pin over BOTH modules.
- Mutation drill performed: removing `mapView`'s scale divide turned exactly the missing-divide
  detector red; revert restored green (logged in the terminal, both directions).
- journey **layersPass** (12 assertions ×3 engines): mirror in count/ids/names/order via the page's
  own `layerEntries`; same-interaction reflection by pointer drag AND injected agent move (fresh
  page); method redraft with frame rows surviving; selection parity both ways (row click ↔ marquee
  via `marqueeRange`+`idsInRange`), second click deselects; one tab stop + roving arrows; Enter on
  frame row (no selection change, brought-into-view sentence, measured in-view); Enter on slot row
  (exactly one count sentence); the vanished-wrapper refusal forced deterministically; runtime
  no-sticky/no-inline-style pins; rebuild-under-focus mid-replay; row click mid-replay NOT a
  take-over; reduced motion.
- journey **minimapPass** (14 assertions ×3 engines): cell-per-wrapper with `cellRect` geometry
  parity; view rect vs `mapView` at rest/panned/zoomed-at-0,0 (the observer's sole detector); the
  no-horizontal-range constraint pinned; drag-pan tracking; injected-move cell tracking;
  click-to-jump settling at `jumpFrom`'s clamp + `visibleRange` sentence announced once; one-cell
  keyboard pans; the blocked press announcing an unchanged range; Home; zero main-frame requests
  across every interaction; mid-replay non-take-over; reduced motion.
- perfPass: 2 new INP rows (26 total), budget ≤ 200 ms ×3 engines.

## Validation results

- Level 1 (Node-import safety): both modules import clean; pure-layer spot checks pass.
- Level 2: `node tooling/build-checks.mjs` → **all 27 groups pass**; mutation drill red/green
  verified (breaking `mapView`'s scale divide turned exactly the missing-divide detector red).
- Level 3: `node tooling/studio-journey.mjs` (all) → **green ×3 engines, 1538 assertions, exit 0**;
  both new INP rows ≤ 200 ms on chromium, firefox AND webkit; the 4×-throttled drag frame check
  green after the patch-per-frame fix. Three earlier cross-engine runs caught three real defects
  first (deviations 7–9) — the driver earning its keep, not flake.
- Level 4: headless smoke + targeted probes — rows mirror the settled stage in order, selection
  round-trips with `applySelection`'s sentence, view rect tracks vertical pan and zoom-at-0,0, the
  keyed-cell patch path follows an injected move, Compile re-measures the viewBox (1232 → 3952) and
  revert restores it, zero console errors, zero inline styles, no sticky.
- Level 5: `gen-param-count` (+2, exact — 118 → 120), `gen-loc-summary` regenerated on the staged
  tree (114 files / 38,600 lines), both `--check` clean; VR baselines regenerated via
  `update:docker` (factory ×2 + approach ×2 — see the commit).

## Deviations from the plan

1. **Group numbers 26/27, not 25/26** — #222 merged after the plan's survey and took group 25 (the
   instance stamp). The build-checks header index also gained the #222 line it was missing.
2. **The minimap's horizontal axis** — the plan missed a recorded /factory constraint: #214's
   `.stu-shell .stx-viewport { width: max-content }` pin means the scroller NEVER overflows
   horizontally (`scrollWidth <= clientWidth` at every zoom; `scrollLeft` clamps to 0 — already
   recorded in studio-journey's R5 note). The plan's "scroll to 260,170" and horizontal-jump
   fixtures are unrunnable as written. Resolution (pure layer untouched): the mount measures TWO
   widths — view rect + announcement take the reader-VISIBLE width (scroller box clipped by the
   window edge, measured in the handler; a window resize listener joins the event sources), while
   `jumpFrom` takes the scroller's real client size so computed target === browser clamp. The
   journey's panned condition rides the vertical axis; the blocked-press case rides the horizontal
   one and pins the constraint itself. The structural re-grid was already rejected as owner-gated
   by the plan's Open Question 2. Recorded in the plan's AMENDMENTS and in both module headers.
3. **Pure-function signatures destructure in the body** (not the signature) — a default parameter
   covers `undefined`, not `null`; caught by group 27's totality sweep on its first run
   (studio-select.mjs:110-113's recorded fix, applied).
4. **`layerEntries` floors coordinates at 1** — `null` coerces to a finite 0, which no grid holds;
   caught by group 26 on its first run.
5. **The empty-state branch of the layers list is not journey-exercised** — on /factory the frames
   place at mount, so the list is never empty on the shipped page, and no verb removes the last
   wrapper. The pure layer's empty answer is gated (group 26); the DOM branch is two lines
   (append/remove of a static sentence). The plan itself marked this "a journey micro-case if
   cheap" — it was not cheap.
6. **param-manifest true-up in passing** — an editing slip briefly dropped #217's `.stx-menu` entry;
   caught by the +1-instead-of-+2 count check and restored in the same task.
7. **Firefox puts scrollable containers in the tab order** — caught by the ×3-engine run (chromium
   green, firefox red on the ONE-tab-stop case): the list's own `overflow-y: auto` scroller became
   a tab stop between the minimap and the first row. Fixed with an explicit `tabindex="-1"` on the
   `<ul>`, and the arrow-path focus dropped `preventScroll` so a row below the list's own fold
   scrolls into its box on a long board (the menu idiom's preventScroll reasoning — a scroll closes
   it — does not transfer here). The single-engine blindspot memory, earning its keep again.
8. **The minimap's cells patch per frame; the full rebuild is the childList/compile path** — #213's
   4×-throttled drag check flagged a 52 ms long-animation-frame against Task 4's prescribed
   rebuild-on-any-mutation (a `getComputedStyle` + whole-SVG redraw inside the gesture's frame at
   every cell crossing). Cells are now keyed to their wrappers (`data-for`) and a moved wrapper
   patches four attributes on its own cell; the full measure-and-redraw runs only on MOVABLE
   childList changes and on `data-compile-state` — the plan's own NOTES discipline, applied to the
   task text that contradicted it. The compile trigger also closes a staleness gap the plan's
   "viewBox constant because the tracks are fixed" claim hid: Compile flips `--stx-slot-h`
   140→480px and the stage GROWS, so the content box and viewBox are re-measured on every full
   rebuild (verified: 1232 → 3952 on Compile, back exactly on revert).
9. **Journey pointer fixtures park at center** — after `open()` the rail's top sits under the
   site's fixed header, where a raw `mouse.click` lands on the header and does nothing, silently
   (zero announcements was the tell). Both minimap click cases and the `minimap jump` INP row park
   their target with an instant `scrollIntoView({ block: "center" })` first (methodPass's rule),
   and the mid-replay case gained a movement proof so it cannot pass on a dead click.

## Issues encountered

- Groups/rows counts in three maintained places (bounds log, success sentence, CLAUDE.md) were
  already stale in three different ways, as the plan predicted; all trued up to 26 rows / 27 groups.

## PR #272 review fixes (post-review commit)

The agentic review (`.claude/code-reviews/pr-272-review.md`) approved with two Medium and two Low
findings; the follow-up commit on this PR takes three and defers one:

- **M1 fixed** — `rebuildCells()`'s frame classification imported `FRAME_CLASS` and flipped to the
  positive `classList.contains` check, matching `studio-layers.mjs` and its own header's
  "imported, never re-literalled" rule (it was the repo's sole negative-literal outlier).
- **M2 fixed** — the deviation-8 compile→re-measure branch now has a repeatable gate: minimapPass
  case 9 presses Compile, asserts the viewBox is the compiled stage's own box and every cell sits
  at `cellRect`'s answer over the FRESHLY measured tracks, then reverts and asserts exact
  restoration. It runs after the zero-request claim deliberately (the first compile legitimately
  fetches `vocabulary.json`).
- **L1 fixed** — `rebuildCells()` ends with `updateView()`, so the view rect re-scales in the same
  flush as the viewBox it lives in (the two existing `rebuildCells(); updateView();` pairings
  collapsed into it); closes the pending-rAF stale-rect window.
- **L2 deferred to #273** — the role-less focusable map `div` carrying `aria-label` is an advisory
  ARIA trade-off the module header records deliberately; whichever direction lands
  (`role="application"` vs an `aria-describedby` caption) is an owner decision, logged as its own
  issue rather than folded in here.
