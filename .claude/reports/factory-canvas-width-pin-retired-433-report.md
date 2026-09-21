# Fix #433 — /factory's canvas blows out of its grid cell: the width pin retired

**Branch** `fix/factory-canvas-width-pin-433` (base `main`, rebased from `feature/canvas-swap-grid-retired-302` @ `a10a3d0` after its squash-merge) · **Issue** [#433](https://github.com/linardsb/ux-factory/issues/433) · **Plan** `.claude/plans/factory-canvas-width-pin-retired-433.md`

**The ticket's proposed cause is measured false, and the fix is a deletion rather than an addition.** #433 asks for `min-width: 0` on `.stx-viewport` and `.stx-scroll` — PR #54's rule — and asks that it be verified rather than assumed. Verified: that rule changes nothing here. The blowout is `#214`'s `.stu-shell .stx-viewport { width: max-content }`, and removing that one declaration is the whole fix.

---

## What was measured

Chromium, 1440 viewport, after `[data-replay="settled"]`, walking up from `[data-studio-canvas] .stx-scroll`:

| | `.stx-scroll` | `.stx-viewport` | `.stu-canvas-col` | scroller `scrollW / clientW` | X range |
|---|---|---|---|---|---|
| before | 3172 | 3172 (`width: 3171.81px`) | 776 (`min-width: 0`) | 3170 / 3170 | **0** |
| after | 776 | 776 | 776 | 2816 / 774 | **2042** |

Identical at 1280. Firefox measured 3174 → 776 and webkit 3172 → 776; both land on the same 2042.

**`min-width: auto` was never the binding constraint.** `.stu-canvas-col` already carries `min-width: 0` and really does resolve to 776px — the measurement above says so. `.stx-scroll` is `overflow: auto`, whose min-content contribution is 0, so the flex column above it has no wide min-content to push through the track. The viewport is 3172 because it is *explicitly* `width: max-content`. Three patches were compared:

| patch | `.stx-viewport` | X range |
|---|---|---|
| A — delete the pin | 776 | 2042 |
| B — A + `min-width: 0` on `.stx-viewport` | 776 | 2042 |
| C — B + `min-width: 0` on `.stx-scroll` | 776 | 2042 |

A, B and C are identical on all three engines. **No `min-width: 0` is added**: a declaration that changes nothing while carrying a comment naming a cause is worse than no declaration, and this repo's own `check-that-cannot-fail` lesson is the reason to say so rather than add it defensively.

## A third defect — this one the fix would have CAUSED, caught before it shipped

With the canvas clipped to 776px the fieldwork device frame (stage x 472, w 692) shows only 302px of itself, and **WebKit then never loads it**: `/proto/fieldwork.html` is not requested at all, the iframe stays at `about:blank`, and panning does not revive it.

| tree | engine | `/proto/fieldwork.html` requested |
|---|---|---|
| pin restored | webkit | ✅ requested, `readyState: complete`, 10 lanes |
| fix, at rest | webkit | ❌ never requested, `about:blank`, 0 lanes |
| fix, after `scrollLeft = 600` | webkit | ❌ still never requested |
| fix | chromium · firefox | ✅ both |

A Safari reader would meet a permanently blank Fieldwork prototype on `/factory` — and on `instance.html`, which carries the same studio band. **`loading="lazy"` is removed from `system/studio-frames.mjs`.** The attribute was a hedge against two proto boots, and the note carrying it reasoned that an engine ignoring it "changes nothing that is asserted anywhere" — which had the failure mode backwards: webkit honours it and never fires. The removal was verified the way it was diagnosed — drop the attribute, re-run the same probe, watch webkit request the page. `visual.spec.mjs`'s handle note, which cited the attribute, is corrected; its argument never rested on it.

This is also what had webkit **throwing** at 427 rather than failing an assertion, so the layers and minimap passes were not reached on that engine at all until it was fixed.

## A second defect the fix closes, found while measuring

The canvas verb row overflowed the column too, not just the stage. Hit-testing every `.stx-verbs` / `.stx-align` button at its own centre, both trees:

| tree | buttons | unreachable |
|---|---|---|
| before | 10 | **2 — "Across" (x 978–1092) and "Down" (x 1096–1194), both blocked by `.stu-layer`** |
| after | 10 | 0 |

Those two distribute verbs sat past the 776px column, inside the inspector rail's span (944–1296), where `.stu-inspector { z-index: 1 }` painted the rail over them. They were visible in no baseline and clickable by no reader. This is #214's method-band defect on a different row, and nothing tracked it.

The mechanism is also why one driver fixture broke: the align row wraps at 776px (44px → 92px), the canvas viewport grows 874 → 1082 and the page 7961 → 8168, so a click on Zoom out now scrolls the page and moves the scroller under the window's bottom edge.

## What changed

**The fix — one declaration.** `system/studio.css`: `.stu-shell .stx-viewport { width: max-content; }` deleted. The comment block stays, rewritten to say why there is no rule there and why no `min-width: 0` replaced it.

**Eight comments that recorded the blowout as live.** Found by sweep, not by memory — `grep -rn` for `max-content`, `scrollWidth <= clientWidth`, `no horizontal`, `un-scrollable`, `2818`, `3172`:

| file | what was false |
|---|---|
| `studio.css` `.stu-canvas-col` | "keeps its exact pre-#214 geometry through the width pin below" |
| `studio.css` `.stu-inspector` | the #218 pointer fix described a live overlap |
| `studio.css` `.stu-compile-step` | "a wrapping row CANNOT wrap (the container has room for anything)" |
| `studio.css` `.stu-replay` | "the viewport is far wider than the column it sits in" |
| `studio-minimap.mjs` call 5 | the two-width split's whole premise |
| `studio-minimap.mjs` `visibleWidth` / `jumpMetrics` / the resize listener | three restatements of it |
| `studio-journey.mjs` ×3 | the anchor note, selectPass's R5 note 1 and R7, minimapPass's header |

Committed plans and reports are historical records of what was true when written and were **not** rewritten.

**Two redundancies kept deliberately, each saying so in place.** `.stu-inspector { position: relative; z-index: 1 }` — removing a stacking context is an unrequested paint change on a captured surface, and the blowout it backstopped is one re-added declaration away. The minimap's two-width split — the two questions are still different ones (what the reader can SEE vs what the browser will ACCEPT); they merely now answer the same number on both surfaces.

## The driver

**The ticket's explicit ask: the X-axis anchor assertion, and the note deleted.** Done — and the note was wrong in a way worth recording rather than merely stale. It said the X axis could not be asserted because the scroller's client box grows with the extent, citing 3172 inside 776. That measurement is real, but it is `/factory`'s, and the row it was attached to runs on **`studio.html`**, which has no `.stu-shell`, never carried the pin, and has had a ~1650px horizontal range all along. The X half was always available there. The row now pans both axes, asserts both caps are real, and asserts the stage point under the cursor on both.

**Three rows the fix turns red, each a different kind:**

| row | why | what it became |
|---|---|---|
| `#221 · the horizontal axis genuinely has no scroll range on /factory` | the constraint is retired | inverted into a positive control (`scrollW > clientW`), plus a new row asserting visible width == clientWidth |
| `#221/AC3 · a BLOCKED press … ArrowRight has no horizontal range` | ArrowRight now pans | split in two: the horizontal mirror of the ArrowDown pitch row, and a blocked press **made** by parking at the right edge |
| `#221/AC3 · a real drag-pan of the canvas moves the rect` | a fixture, not the page — the derived point landed at y = 1144 outside a 1000px window | re-centre the scroller, then SCAN for an empty point clamped to the window (`journey()`'s own rule), with a row asserting the point was found |

`click-to-jump settles at jumpFrom's clamped target` was vacuous on X before (both sides clamped to 0) and is a real claim now; it passes unchanged.

## Gates

| gate | result |
|---|---|
| `node tooling/build-checks.mjs` | ✅ all 36 groups pass |
| `node tooling/token-lint.mjs` | ✅ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` (after staging) | ✅ no drift — `git diff --numstat` over `system/` is +89 −66, net +23 (the report first said +10, corrected by the review's F7); the `--check` line is the proof the `approach` baselines do **not** move, not the arithmetic |
| `node tooling/drift-check.mjs` | ✅ syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| portal boot + `/api/health` | ✅ `{"ok":true,…}` on a private port (4796) |
| `node tooling/studio-journey.mjs all` | ✅ **chromium 537 · firefox 533 · webkit 533, 0 failed**, `studio-journey ✓` — plus a second webkit-only leg at 533/0 |
| pixel gate, committed baselines | ✅ 33/33 in the Docker image CI pins — but this confirms DETERMINISM, not correctness: the baselines were regenerated from this tree, so the gate is self-confirming after a regen (PR #246's own recorded note). The correctness evidence is the eyeball comparison below. |
| pixel baselines `factory-{neutral,saulera,verdant}` | ✅ regenerated; the other 30 byte-identical |

**One flake, recorded rather than hidden.** An intermediate run had chromium red on `frame check · zero long-animation-frame entries overlap the drag window` with a single 52ms entry. That row is the 4×-CDP-throttled drag sample; it was green on the run before it and green on the final run, on an otherwise identical tree. Treated as load sensitivity, not a regression — and said here rather than left out of the tally.

**Row counts.** Counted off the diff: eight `t(` rows added and four removed, net **+4 per engine**, all in passes every engine runs (the anchor pair in `journey()`, one in `layersPass`, five in `minimapPass`). The after-tallies above are observed. No before-tally was observed on the base tree — webkit threw at 427 there, and the chromium/firefox figures an earlier draft of this paragraph quoted (536, 533) were not measured and are withdrawn (review F2); by subtraction they would have been 533 and 529.

**What actually says the baselines are right.** The same 900px band was cropped out of the old and new `factory-neutral.png` and compared by eye. Old: the canvas runs off to the right with **no boundary at all** — the fourth block cut by the page, the area past it blank white with the column extending transparently across. New: the scroller ends at the column's own edge with its border and radius, and the fourth block is clipped by the scroller, which is what "scrollable-to" looks like. The masked iframe rectangle overhangs the rail in **both**, so that artefact is pre-existing and not something the fix introduced.

## Out of scope, and why

Narrowing or re-proportioning the canvas column; moving `.stu-replay` inside the viewport; converting selectPass's far-edge menu row to a pointer path now that the far edge is reachable (it exists to pin the flip arithmetic, and a pan fixture would make it partly about panning). Each is an at-rest change to a captured surface with no behaviour to gain here.

## What this does not claim

**The canvas window.** `/factory` and `instance.html` now show a 776px window onto a 2816px stage with a visible right edge, where they previously showed the same 776px with the remainder painted into the clipped region. Same content, plus a way to reach the rest — but it IS a visible change to a designed surface, and whether the column should be re-proportioned is a design call for the owner, not this fix.

**The control row now wraps, and that is a second visible change.** The eight align/distribute verbs were one 44px row in a 3172px container and are two rows (92px) in a 776px one; the canvas viewport grew 874 → 1082 and the page 7961 → 8168. It is in the regenerated baselines. It is also strictly better than what it replaced — two of those buttons were unreachable — but a control row that quietly became two rows is a look change, and the owner's standing verdict on `/factory` is about look.

**`instance.html` was not driven.** It carries the same `.stu-shell` / `.stu-canvas-col` band, so it inherits both the width fix and the `loading` removal, including the webkit defect. `tooling/instance-journey.mjs` is operator-run, needs a built instance dir, and was **not** run here — its one canvas interaction (`click .stx-scroll` at 40,40) is inside the narrowed column either way, so nothing in it is expected to move, but that is reasoning rather than a run.

**The `<900px` layout is a third visible change, and it is not measured.** The deleted rule carried no media scoping, so below the 900px step where `.stu-shell` collapses to one column (`studio.css`) the scroller also gains a horizontal range for the first time. Every figure here is at 1440 or 1280; no driver row and no pixel spec opens a narrow viewport, so nothing in the repo captures it (review F5).

**The base moved under the PR.** Every figure and all three PNGs were taken against `feature/canvas-swap-grid-retired-302` @ `a10a3d0`. That branch was squash-merged as `4550925` and this branch rebased onto it; `git diff a10a3d0 4550925` is two review documents, one `gates.md` line and six comment lines in the driver, no shipped file — so the baselines still describe the tree they sit on (review F8).

**Webkit was re-run, because one observation is not two.** It threw at 427 on both runs before the frames fix, so the three-engine run above was the first time the driver executed the rewritten minimap rows and the layers marquee fix on that engine at all. A second webkit-only leg was run on the final tree: **533 passed, 0 failed**, `studio-journey ✓`. The focused probe had already covered those same rows on webkit separately (9/9 green).

## Review fixes (PR #435, `.claude/code-reviews/pr-435-review.md`)

- **F1 fixed** · the in-window background scan answers the scroller's centre with `empty: false` instead of `null`, so the reachability row goes red by name and the rows after it still run; before, `panPt.x` threw out of `minimapPass`. Mutation below.
- **F2 fixed** · the row-count paragraph withdraws the unobserved before-tallies and states the diff count: +8 −4, net +4 per engine.
- **F3 fixed** · the three driver comments naming `loading="lazy"` as live now say it left with #433 and what starts the frames instead; `grep -n 'loading="lazy"' tooling/*.mjs system/*.mjs` leaves only `studio-frames.mjs:243`, which records the removal.
- **F4 fixed** · the visible-width row's comment calls it a corollary with border-box slack, not an independent witness.
- **F5, F6, F7, F8 recorded** · the `<900px` change named as unmeasured; the before-row reads `3170 / 3170`; the `system/` delta is +23 with the `--check` line as the proof; the base SHA and the post-merge tree diff are stated above.

