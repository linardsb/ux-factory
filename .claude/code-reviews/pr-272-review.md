# PR #272 review — feat(221): the layers list + the minimap

**Reviewer**: /piv-review-pr (fresh-context agentic gate — code-reviewer agent + independent validation re-run)
**Branch**: `feature/studio-layers-minimap-221` @ `a867a26` (single commit, contains `origin/main`'s tip; mergeState CLEAN)
**Verdict**: **APPROVE** — with two Medium findings recommended as a follow-up fix commit on this PR before merge, per the house pattern. No Critical, no High.

## Summary

The PR delivers #221 exactly as planned and honestly reported: two new hand-written-canon modules (`system/studio-layers.mjs`, `system/studio-minimap.mjs`), each split pure-layer/mount, gated by new build-checks groups 26/27 and by `layersPass` (20 assertions) + `minimapPass` (14) + 2 INP rows in the journey. The implementation report documents nine deviations, all judged intentional and sound — including the two that matter most (the /factory horizontal-axis constraint the plan missed, and the patch-per-frame split the 4×-throttled drag check forced). The coordinate math was independently re-derived against `studio-verbs.mjs`'s forward `pointToSlot` chain and checks out; the take-over discriminator claim is structurally true, not just asserted; teardown is complete; the gates are run-the-function with independently computed expectations and real mutation drills.

## Issues

### Medium

**M1 · `system/studio-minimap.mjs:337` — frame classification re-literals `"stx-slot"` instead of importing `FRAME_CLASS`.**
`const frame = !wrapper.classList.contains("stx-slot");` is the sole outlier in the repo: every other reader — including this PR's own sibling `studio-layers.mjs:156` — does the positive `classList.contains(FRAME_CLASS)`, and `studio-layers.mjs`'s header itself argues "imported, never re-literalled". Not a live bug today (`MOVABLE` is exactly `.stx-slot, .stx-frame`, so the checks agree), and undocumented in plan and report. Failure scenario: a third movable family would be silently classified as a frame here — the opposite default from everywhere else — with nothing gating it.
**Fix**: import `FRAME_CLASS` alongside `MOVABLE, ZOOM_LEVELS` and use the positive check in `rebuildCells()`.

**M2 · `tooling/studio-journey.mjs` (minimapPass) — the compile→viewBox re-measure has no repeatable gate.**
Deviation 8's staleness-gap fix (Compile flips `--stx-slot-h` 140→480px; the `data-compile-state` observer branch at `studio-minimap.mjs:379-385` forces the full rebuild that re-measures `geom`/`contentW`/`contentH`/viewBox — "verified: 1232 → 3952 on Compile, back exactly on revert") is verified only by the implementation session's one-off headless probes. No journey case presses Compile and asserts on the map's cells/viewBox afterwards; group 27 is DOM-free and structurally cannot see computed tracks; the pixel gate captures the pre-compile settled state. This is the repo's own named anti-pattern (the check that cannot fail): delete the `data-compile-state` branch, or drop the re-measure inside `rebuildCells()`, and every gate stays green while the minimap overlays stale pre-compile geometry on a compiled stage. Both the orchestrating reviewer and the code-reviewer agent found this independently.
**Fix**: one minimapPass case — press Compile, assert `viewBox`/cells against `cellRect(...)` over the freshly measured tracks, revert and assert restoration — the compile round-trip layersPass already has for rows.

### Low

**L1 · `system/studio-minimap.mjs:328-348` — a full cells rebuild never re-runs `updateView`, leaving a narrow stale-view-rect window.**
If a view-update rAF is already pending (an earlier scroll in the same frame) when the `data-compile-state` mutation arrives, that rAF was registered before `flushCells`' and fires first: `updateView` computes against the stale closure `contentW/contentH`, then `rebuildCells` rewrites the viewBox — so the view rect sits mis-scaled in the new viewBox until the next scroll/zoom/resize event heals it. Transient and self-healing, hence Low.
**Fix**: end `rebuildCells()` with `updateView()` (the pairing `refresh()` already does).

**L2 · `system/studio-minimap.mjs:255` — the map is a role-less focusable `div` carrying `aria-label` (advisory).**
The header records the deliberate call against `role="img"` and `<button>`, but the element it settles on has role *generic*, on which ARIA 1.2 prohibits naming — so `MAP_LABEL` (the widget's entire keyboard affordance statement) is formally not exposed, and AT behaviour on label-on-generic is inconsistent in practice. Advisory because the recorded call is a genuine trade-off and no journey assertion can see SR output.
**Suggestion**: consider `role="application"` (arrow keys are app-handled, which is that role's case) or a visually-associated caption via `aria-describedby`; owner's call.

## Validation

| Check | Result |
|---|---|
| `node tooling/build-checks.mjs` (review worktree) | **all 27 groups pass** |
| `gen-loc-summary.mjs --check` / `gen-param-count.mjs --check` | no drift · 120 controls |
| `node tooling/studio-journey.mjs chromium` (independently re-run in a clean worktree, fresh serve) | **515 passed, 0 failed, exit 0** — layersPass, minimapPass, all 26 INP rows ≤ 200 ms, frame check green, zero page/console errors |
| firefox + webkit journey, Docker VR (22/22), ×3-engine 1538 assertions | author-reported green; not re-run here (macOS cannot validate Linux baselines — platform memory) |
| Branch state | 1 commit, contains `origin/main` tip, MERGEABLE/CLEAN |

## What's done well

- **Gate quality is the real thing**: groups 26/27 compute every expectation independently (the 2×3 `cellRect` union, the hand-computed `trackOffsets` fixture, the three sole-detector `mapView` conditions), and the journey passes derive expected state through the page's own pure imports — never literals, never compare-to-self.
- The **take-over discriminator claim is structural**, verified against `replay-driver.mjs`: the rail sits outside `canvas.scroll`, and a programmatic scroll write fires only an event the driver doesn't watch — then the journey asserts it anyway, with movement proofs so no case passes on a dead click.
- **Deviations reported honestly and specifically** — nine, three of them real defects the ×3-engine driver caught pre-merge (firefox's scrollable-container tab stop, the 52 ms long-animation-frame, the header-occluded click), each with the diagnostic tell recorded.
- **Teardown is complete** in both mounts: every observer disconnected, pending rAFs cancelled, one AbortController per mount.
- The `writes === 1` forcing function produced a genuinely better mechanism (SVG presentation attributes) rather than an argued exception — third application, and the pattern is clearly load-bearing now.
- `param-manifest.json`'s two entries follow the file's own counting rules, and the passing true-up of #217's dropped `.stx-menu` entry was caught by the PR's own count check.

## Recommendation

**Approve.** Validation is fully green and independently reproduced on chromium; the two Medium findings are small, concrete, and fit the established follow-up-fix-commit pattern on this PR (M1 is mechanical; M2 is one journey case). L1/L2 are owner's-discretion polish. Posted as a comment rather than a formal approval — solo-repo constraint.
