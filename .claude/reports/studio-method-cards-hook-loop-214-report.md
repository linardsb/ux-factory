# Implementation Report — Studio 12: on-canvas method cards + the assemblable Hook loop (#214)

**Plan**: `.claude/plans/studio-method-cards-hook-loop-214.md`   **Branch**: `feature/studio-214-method-cards-hook-loop`   **Status**: COMPLETE

## Summary

The ten method questions (Hooked ×7, Shape Up ×3) are now on-canvas cards in a method band inside
/factory's canvas column: answering one wholesale-redrafts the board on the canvas in the same
interaction, through `draftBoard` and studio.mjs's new `adoptBoard` seam. The Hook loop is an
assemblable four-node select-then-place diagram whose completion — and only its completion —
unlocks the ethics verdict, rendered from the imported `quadrantFor`/`frequencyVerdictFor`/
`QUADRANT_MEANINGS` with no second copy of any rule. `/build` is untouched; both surfaces stay two
mounts of one store, and share links restore in both directions with zero interaction.

## Tasks completed

- Task 1 branch → `feature/studio-214-method-cards-hook-loop` off `793a270`
- Task 2 `HOOK_STAGES` + load assert → `system/build-questions.mjs` (UPDATE, additive only)
- Task 3 `getAnswers` option → `system/studio-compile.mjs` (UPDATE, 2 call sites + destructure)
- Task 4 `let answers` · `adoptBoard` · provenance (`run`/`restored`/`drafted`) · `renderSummary`
  rework · method wiring · `publishBoard(finalBoard, provenance)` → `system/studio.mjs` (UPDATE)
- Task 4b `relinquish()` handle seam + `PROVENANCE_REDRAFTED` → `system/replay-driver.mjs`
  (UPDATE — **deviation 1**, below)
- Task 5 the method band module → `system/studio-method.mjs` (CREATE, ~350 lines)
- Task 6 the band's markup + no-JS copy → `factory.html` (UPDATE)
- Task 7 `.stu-method-*`/`.stu-mcard-*`/`.stu-hook-*`/`.stu-verdict-*` styles + the canvas-column
  track fix → `system/studio.css` (UPDATE — **deviation 3**, below; no transitions/animations, so
  the reduced-motion literal list gains nothing, stated in the block header)
- Task 8 +12 `/factory` manifest entries → `system/param-manifest.json`; regen
  `system/param-count.json` (25→37, total 103→115)
- Task 9 `studio-method.mjs` map line → `CLAUDE.md`; regen `system/loc-summary.json` on the staged
  tree (runtime 73→74 files, 26 100→26 700 lines) — `--check` clean
- Task 10 group 7 roster + new **group 20 "method"** → `tooling/build-checks.mjs`
- Task 11 `methodPass` (14 assertions) + 2 INP rows → `tooling/studio-journey.mjs`
- Task 12 the method-redraft sample → `tooling/vt-verify.mjs`
- Task 13 full battery (below)
- Task 14 VR baselines regenerated from a clean detached worktree (factory ×2 + approach ×2)
- Task 15 this report + PR

## Tests added

- **build-checks group 20** (CI, pure layer): `HOOK_STAGES` pinned to the four Hooked questions in
  loop order + frozen, with the coupling predicate proven able to fail on a tampered clone;
  `assembleReducer` truth table (accept, wrong stage naming the stage and slot, wrong slot,
  occupied, 8 hostile stage ids and 7 hostile slots — refused, never thrown, input never mutated);
  `hookComplete` exact-4/4 only, incl. 3/4, swapped 4/4, junk, and the smuggled-shaping-id
  mutation; `verdictFor` identity with the imported rules over 4 quadrants × 2 frequency branches,
  total over junk; `RENDER_SOURCES` = exactly `{"questions","restore"}` (the #193 tripwire + the
  redraft loop-breaker).
- **studio-journey methodPass** (operator, ×3 engines): mid-replay disabled band + a disabled-band
  pointerdown proven NOT a take-over/redraft; enabled in settle's own task; pointer card answer
  redrafting to `draftBoard`'s own board computed in Node label-for-label; announcement counted
  (places + 1 redraft sentence); provenance flipped in the notice AND the panel note in the same
  words; the published board matching the canvas; the driver relinquished (transport dead, still
  settled, the set-aside sentence, no take-over route); keyboard card answer (per-engine: radio
  arrows on chromium/firefox, focus+Space on webkit — see deviation 6); wrong-stage refusal (fixed
  sentence, DOM untouched); pointer assembly with 4+4 announcements counted exactly and the
  combined completion sentence; verdict identity via the imported rules; ethics-after-unlock
  re-render; keep-rail link decoding back to the drafted board + answers; keyboard-only assembly
  on a fresh page; the `?b=` #193 mode populating cards, diagram and verdict with zero interaction
  on a never-disabled band.
- **perfPass +2 INP rows**: `method card radio click` (the full redraft path) and
  `hook slot place click`, at the table's tail so the redraft can't disturb earlier rows.
- **vt-verify factory sample (c)**: the method-card redraft (incl. the revert of a compiled stage)
  — movement proven first, zero transitions opened, zero pseudos running, ×3 engines.

## Validation results

| Gate | Result |
|---|---|
| `node --check` (8 touched .mjs) | pass |
| `node tooling/build-checks.mjs` | **all 20 groups ✓** (group 8 untouched and green) |
| SDK-free form (`portal/node_modules` moved away) | all 20 groups ✓ |
| `gen-param-count` / `gen-loc-summary --check` | +12 / no drift |
| `studio-journey` | **chromium 318/0 · firefox 314/0 · webkit 314/0** (baseline 298/294/294 → +20 each) |
| `build-journey all` (/build regression, AC #4) | 157/0 ×3 engines |
| `vt-verify` | green ×3 engines, new sample printing |
| `proto-journey chromium` (canary) | all assertions passed |
| VR baselines | regenerated via `update:docker` in a clean detached worktree; churn = factory ×2 + approach ×2 (see PR checks for the CI `visual` truth) |

**INP, the two new rows (chromium)**: method card radio click **32 ms** (3 entries) · hook slot
place click **24 ms** (6 entries) — budget 200 ms; green on firefox and webkit too.

**Red-run proofs (verbatim)**

Group 20 — `HOOK_STAGES` reordered (`action` before `trigger`) in a scratch tamper:

```
build method         ✗  3 failure(s)
build ✗  3 failure(s)          (exit 1; reverted → all 20 groups pass)
```

methodPass — `adoptBoard(...)` call commented out of the redraft:

```
✗ #214 · AC #1 · a pointer answer redrafts the canvas to draftBoard's OWN board, label for label, computed in Node  ["Today Overview","At-Risk Queue","Job Detail","Reassignment Confirmation"] vs ["Worklist","Progress","Settings"]
✗ #214 · AC #1 · …announced once per placement plus the one redraft sentence …  1 record(s)
✗ #214 · AC #1 · provenance flips in BOTH standing places …  {"hidden":true,"text":""}
✗ #214 · AC #1 · the orchestrator's published board matches the canvas it drew …
✗ #214 · the redraft RELINQUISHES the driver …  {"took":false,…,"seekDead":false,…}
✗ #214 · AC #1 · the keyboard path …
── chromium: 312 passed, 6 failed          (reverted → 318 passed, 0 failed)
```

## Deviations from the plan

1. **`system/replay-driver.mjs` gained a `relinquish()` handle method (+`PROVENANCE_REDRAFTED`)**,
   against the plan's "not touching replay-driver.mjs". Verified in source before deciding: after
   settle the transport's **seek slider stays live** (`seek.disabled = tookOver || !beats.length`,
   replay-driver.mjs:612), and a backward seek REBUILDS the run's board op by op onto the stage —
   onto a stage that, after a card redraft, holds the visitor's drafted board. Two authors on one
   stage, reachable by one scrub. The band deliberately lives outside `canvas.scroll`, so `onTouch`
   can never see a card and no existing path closes this. The driver's own declined-mount idiom
   ("tookOver IS 'this driver will not write to the stage again'", :828) plus studio.mjs's header
   doctrine (a needed cross-module call is *a missing seam in that module*) made a 9-line additive
   handle method the correct fix. It fires **no take-over route** (#75's rule — a card answer is
   not a grab of the wheel) and sets a dedicated honest provenance sentence, because
   `PROVENANCE_VISITOR` ("The run's work, with your edits on top.") would be false of a redrafted
   stage. Gated: methodPass's relinquish case + the red-run above (which shows `seekDead:false`
   when the seam is bypassed).
2. **A third provenance value, `"restored"`.** The plan specified `"run"`/`"drafted"`; but the
   reworded "This build" note made the run-credit sentence explicitly false on the `?b=` declined
   path (the board there is the sender's, and the pattern is named from the restored answers, not
   the recommended ones). `boardProvenance` initialises `declined ? "restored" : "run"` and the
   note gets an honest third branch. Gated by methodPass's AC #5 case ("link you followed").
3. **The canvas-column track fix in `system/studio.css`** (not in the plan). The band made a
   latent, documented-but-deferred layout phenomenon a real defect: `.stu-canvas-col` had no
   explicit track, so its one implicit `auto` track was inflated to ~2818 px by `.stx-viewport`'s
   max-content, and the band — the first sibling that genuinely fills its box — stretched with it,
   putting cards past x=1440 where `body{overflow-x:clip}` makes them **pointer-unreachable**
   (found by the headless smoke: an input at x=1462 on a 1440 viewport). Fix:
   `grid-template-columns: minmax(0,1fr)` on the column + `.stu-shell .stx-viewport { width:
   max-content }` pinning the canvas at exactly its previous geometry. Measured before/after at
   1440: viewport, scroll, stage and every slot byte-identical; only the band narrows. The full
   journey battery (hit-test in three conditions included) is the running proof nothing else moved.
4. **The DRAFTED notice write lives in studio.mjs's `adoptBoard`, not the method module's
   `redraft`** (the plan put it in Task 5). One constant (`DRAFTED`) now feeds the notice AND the
   panel note — the same one-copy rule `restoreShared`'s two-places pattern and studio-flow's S4
   sentence already follow. Behaviour identical; methodPass asserts the two surfaces carry the
   same words.
5. **The reducer refuses non-number slot indices by type, not coercion** — build-checks group 20's
   hostile-slot case caught `Number(null) === 0` accepting a `null` slot as slot 1 during
   implementation. Fixed before anything shipped; the case now pins it.
6. **Per-engine keyboard branch in methodPass's card case.** Playwright's webkit does not move a
   radio group's selection with arrow keys at all (probed: focus and checked both stay put), so
   the webkit branch drives focus+Space on the target radio — the platform's own keyboard path.
   The perfPass `modZ` per-engine precedent, applied. Product code unchanged (native radios).
7. **Pass counts**: chromium 318 · firefox 314 · webkit 314 (chromium runs +4 chromium-only frame
   checks), against the plan's recorded 298/294/294 baseline — +20 per engine.

## Issues encountered

- **Smooth-scroll actionability races** (memory `hover-probes-race-smooth-scroll`, re-confirmed):
  every methodPass/perfPass/vt-verify interaction with the band parks its target with an instant
  `scrollIntoView` first, or Playwright samples mid-travel and retries forever.
- **Redraft mid-"compiling"** is a stated boundary, not closed: `adoptBoard` reverts a *settled*
  compiled stage before clearing, but a redraft inside the beat's ~2 s compiling window leaves the
  in-flight swap to the beat's own count tripwire (loud refusal on mismatch; a place-count
  collision would swap stale screens). Rare, recoverable via "Back to blocks", recorded in
  `adoptBoard`'s comment for a future ticket.
- Undo after a redraft restores nothing visible (dead wrapper ids) — accepted by the plan's NOTES;
  not asserted, not changed.
- The `?b=` restore renders the Hook diagram assembled with no announcements — restore IS
  completion (decision 6); the sender's performance is not narrated as the visitor's.
