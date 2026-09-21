# PR #435 review — `/factory`'s canvas scrolls inside its column, #214's width pin retired (#433)

**Head** `c4e96f5f162fdd8a7c3a5b6915f799ad61702e1b` · **Base** `feature/canvas-swap-grid-retired-302` @ `a10a3d0ed4d7beba32f3dd829aad0848509307b3`
**Round** 1 — no prior review report exists for this PR, so the guarantees pass has no base-move trigger to fire.
**Stacked, not on `main`.** The base is PR #432's branch, and `closingIssuesReferences` is empty — the PR body already says so and is correct (verified).

## Summary

The fix is right and the diagnosis is the best part of it. #433 proposed `min-width: 0` on two selectors; the author measured all three patches, found them byte-identical, and **refused to add a declaration that changes nothing**, saying so in the rule block. The webkit lazy-load defect — the fix would have made `/proto/fieldwork.html` never load in Safari — was found before merge, by probe, and removed with its own measured account. Both are this repo's own `check-that-cannot-fail` lesson applied correctly rather than recited.

What holds the review up is the driver and the report, not the CSS. The PR's own gate numbers re-derive green — I re-ran the chromium leg and got its 537/0 exactly — but the paragraph explaining what those counts *hide* is arithmetically false, one new assertion can destroy the ~30 assertions after it instead of going red (the exact shape this PR fixed on webkit), and the `loading="lazy"` removal left four live comments behind, three of them in the file the PR edited.

## Findings

### High

**F2 — the row-count reconciliation in the report and the PR body does not survive arithmetic.**
Both surfaces say: *"chromium 536 → 537 and firefox/webkit 533 → 533 hides a real change: three rows were added … and one was replaced in place."* Counted off the diff, **eight `t(` rows were added and four removed — net +4 per engine, not three added**, and every one of them sits in a pass that runs on all three engines (the anchor pair in `journey()` itself, one in `layersPass`, five in `minimapPass`):

```
added:   #302 panned ON BOTH AXES · #302/F3 both axes · #221/AC1 marquee ends ·
         #433 has a scroll range · #433 visible == clientWidth · #221/AC3 empty point in window ·
         #433 ArrowRight pans · #221/AC3 blocked press made at the right edge
removed: #302 panned (Y only) · #302/F3 (Y only) · #221 no scroll range · #221/AC3 blocked (free)
```

So every engine's tally should rise by 4 if all four pass. The reported tallies rise by 1 on chromium and 0 on firefox and webkit, at 0 failed.

**Re-derived, and it discriminates.** `node tooling/studio-journey.mjs chromium` against this head → **`chromium: 537 passed, 0 failed`**, exit 0 (observed). So the *after*-numbers are right and the driver really is green on this tree — that part of the PR stands. What cannot be right is the *before*-number: 537 minus the four added rows is **533**, not the 536 the report states, and by the same subtraction firefox and webkit stood at **529**, not 533. (The 4-row gap between chromium's 537 and the other two engines' 533 is `perfPass`'s four chromium-only frame-check rows, which checks out.)

So the reconciliation paragraph is wrong in both halves: four rows were added where it says three, and the before-numbers it reasons from were not observed on `a10a3d0`. The report already concedes exactly this for one engine — *"Webkit's previous number was 427 and a throw, not a pass count"* — without noticing the other two are in the same position.

**What it needs:** drop the before-numbers, or re-run `node tooling/studio-journey.mjs all` on `a10a3d0` and quote both tallies. The after-numbers are observed and should stay. This is High rather than Low because the tally is the *only* evidence the PR offers that the driver still passes, it sits in the PR body — the most-read surface and the one not in the working tree — and the repo has shipped a false number to `main` twice on figures nobody re-derived.

### Medium

**F1 — `tooling/studio-journey.mjs:6511-6513` · the new reachability row can destroy the ~30 rows after it, which is the failure this PR fixed on webkit.**
The scan at 6498 returns `null` when it finds no empty in-window point. `t()` records the failure and returns — it never throws, which is how the tally works — and line 6513 then reads `panPt.x`. That is a `TypeError`, it propagates out of `minimapPass`, out of `journey()`, and lands in the catch at 7187, which prints `✗ chromium threw` and stops. Everything after it is skipped: the rest of `minimapPass` (ArrowRight, the blocked press, Home, the zero-request claim, the whole compile round-trip branch) and all of `perfPass` — 26 INP rows, the comparator self-test and the frame check. The engine reports one failure and a truncated pass count, and a reader comparing 537 against 533 cannot tell that from a row that merely went red.
This is the same shape the report names as its own third defect: *"what had webkit throwing at 427 rather than failing an assertion, so the layers and minimap passes were not reached on that engine."* The sibling row added in the same PR gets it right — `layersPass`'s `pts4.from.onScreen` (≈6180) is safe because `clientPoint` always answers `{x, y, onScreen}` and never `null`, so a bad reading degrades into a correlated red rather than a throw.
**Fix:** `if (!panPt) return;` immediately after the row — or have the scan fall back to a clamped in-window point so the rows below stay reachable and simply fail.


**F3 — four comments still name `loading="lazy"` as live after this PR removed it, one of them load-bearing.**
`tooling/studio-journey.mjs:5528` ("because `loading="lazy"` makes its timing an engine's business rather than a contract"), `:5574` ("`loading="lazy"` is a hedge and nothing in the shipped module depends on when it resolves"), `:7089` ("the two `<iframe>`s are `loading="lazy"`, so scrolling the canvas into view is the moment two whole proto pages begin booting"), and `system/studio-frames.mjs:204` ("makes the pixel baseline depend on when a lazy frame happened to load").
`:7089` is the one that matters: it names `scrollIntoView` as what *starts* the boots, and with the attribute gone the boots start at mount. That comment is the stated reason the `waitForFunction` below it exists, so it is a rule's own specification describing a mechanism that no longer runs.
**This does not hide a live bug** — the waits under all four are unconditional, content-marker based and correct whenever the frame loads (traced, not assumed). It is a spec defect in a repo whose rule is that the file header *is* the specification, and the author already knew the class existed: `visual.spec.mjs`'s note was corrected in this same diff. The sweep's grep patterns (`max-content`, `scrollWidth <= clientWidth`, `no horizontal`, `un-scrollable`, `2818`, `3172`) were all blowout-specific and never covered the second change the PR made.
**Fix:** one more sweep on `lazy` across `system/` and `tooling/`, same method.

### Low

**F4 — `tooling/studio-journey.mjs:6455-6458` · the new visible-width row is close to a corollary of the row above it, not the independent witness its comment claims.**
The comment says it is "the term that would catch it if one did" run past the window edge. The check is `Math.min(s.clientWidth, visible) === s.clientWidth`, i.e. `visible >= clientWidth`, where `visible` comes from `getBoundingClientRect()` (border box) and `clientWidth` is the padding box. Unclipped, `visible` exceeds `clientWidth` by both borders plus any vertical scrollbar, so the row carries a few px of slack before it can fire at all. It is not vacuous — a genuinely re-proportioned column would trip it — but it is weaker than the sentence beside it.
**Fix:** say it is a corollary with a small tolerance, or drop the row.

**F5 — the `<900px` layout is a third visible change, and it is neither measured nor named.**
The deleted rule carried no media scoping, so it applied below the 900px step too, where `.stu-shell` collapses to one column (`studio.css:544`). That surface also gains a real horizontal range for the first time. Every figure in the plan, the report and the PR body is taken at 1440 or 1280; the pixel gate runs `devices['Desktop Chrome']` (1280) and no driver row opens a narrow viewport, so nothing in the repo captures it. The report's "What this does not claim" section enumerates two visible changes carefully — this is the third, and the only one absent.
**Fix:** a line in the report, or a measurement.

**F6 — the report's before-row `scrollW / clientW = 2816 / 3170` is not a reading any run produced.**
`scrollWidth` is never below `clientWidth`. The plan's measurement on the same tree reads `scrollWidth === clientWidth (3170 = 3170)`, and the table's own X-range column says `0`, which `2816 / 3170` would make `−354`. `2816` is the sizer's width sitting in a column labelled the scroller's. The conclusion (no horizontal range) is right either way.

**F7 — "net +10 lines in `system/`" is wrong in both the report's gate table and the PR body; observed +23.**
`git diff --numstat a10a3d0...HEAD -- system/` → `+89 −66`, net `+23` (all three touched files match the runtime group's regex, `agent-layer/gen-loc-summary.mjs:23`). The fix commit alone is `+22`. The conclusion stands and rests on something better anyway: `gen-loc-summary.mjs --check` is green (re-run here), which is the actual proof the `approach` baselines do not move.

**F8 — the base is a live feature branch, and the three regenerated baselines are pinned to it.**
Base `feature/canvas-swap-grid-retired-302` @ `a10a3d0`, whose own round-2 review is still sitting untracked in the working tree. Every number here and all three PNGs were produced against that SHA. If #432 is revised before it merges, the baselines go stale with nothing to say so — the pixel gate is self-confirming after a regen, as the report itself notes. Worth one sentence, and it is why this review's header records the base SHA rather than the base name.

## Validation

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 36 groups (observed) |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid (observed) |
| `node tooling/drift-check.mjs` | ✅ all 13 steps (observed) |
| `node agent-layer/gen-loc-summary.mjs --check` | ✅ 3 groups, no drift (observed) |
| portal boot + `/api/health` | ✅ `{"ok":true,…,"bootSha":"c4e96f5…","stale":false}` on port 4829 (observed) |
| baselines | 3 of 33 changed (`factory-{neutral,saulera,verdant}`), 30 untouched — the report's claim confirmed (observed, `git diff --name-only`) |
| `node tooling/studio-journey.mjs chromium` | ✅ **537 passed, 0 failed**, exit 0 (observed, re-derived for F2 — the PR's own after-number reproduces exactly) |

Not run here: the pixel gate (Docker, and self-confirming after a regen — the report says so itself), firefox/webkit legs, `instance-journey.mjs`.

## What is good

- **The refusal to add a no-op `min-width: 0`.** Measured A/B/C on three engines at two viewports, found identical, and wrote the negative result into the rule block instead of adding a defensive declaration with a false cause attached.
- **The webkit lazy-load defect, caught before shipping.** A fix that would have left Safari readers with a permanently blank Fieldwork prototype on `/factory` and `instance.html`, diagnosed by request probe and verified the same way it was diagnosed.
- **The retired control inverted rather than deleted.** `scrollW <= clientW` became `scrollW > clientW`, so the constraint cannot come back unnoticed. Deleting it would have been the easy move.
- **Two reachability rows added where a fixture failure used to be indistinguishable from a product bug** (`#221/AC1` marquee ends, `#221/AC3` the pan point).
- **The redundancies kept say why in place**, and the `.stu-inspector` comment was corrected mid-PR to claim only what was measured after an untested benefit was noticed.
- **`instance.html` not being driven is stated plainly** rather than left implied, and `/api/health`'s `bootSha` confirms the report's tree.

## Recommendation

**Request changes** — on **F2** (a gate tally in the PR body that the diff contradicts), **F1** (a new assertion that silently removes roughly thirty later assertions instead of going red) and **F3** (four comments describing a mechanism this PR deleted). None of the three touches the fix itself, which is correct and unusually well evidenced.

F4–F8 are advisory. F5 and F8 are the two worth a sentence each in the report rather than a code change.

**Nothing here argues against the fix.** The deletion is right, the refusal to add a no-op `min-width: 0` is right, and catching the webkit lazy-load defect before merge is the single most valuable thing in the PR. What needs another pass is the driver's new failure path and the two prose surfaces that describe them.

The `Closes #433` trailer will not fire while the base is `feature/canvas-swap-grid-retired-302` — the PR body says so and `closingIssuesReferences` is empty, confirmed. Either merge #432 first and let GitHub retarget, or close #433 by hand.
