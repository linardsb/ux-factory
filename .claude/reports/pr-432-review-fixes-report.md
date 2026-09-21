# PR #432 — review round 1, fixes

**Branch** `feature/canvas-swap-grid-retired-302` · **Base** `main` @ `287445e1` · **Review** [comment 5750876681](https://github.com/linardsb/ux-factory/pull/432#issuecomment-5750876681) — 1 critical, 3 high, 8 medium, 8 low

**Scope: the owner took all four triage buckets**, so every finding is addressed except the five open questions, which are theirs. F18, F19 and F20 were folded in unasked — same class as the prose sweep, and cheap.

**Two of the review's own citations were wrong and were re-derived before acting:**

- **F8b named `:3347`**, which is already correct on this tree ("THE CLAIM IS RETIRED, NOT TRANSLATED"). The three real sites are `:3007`, `:3296` and the summary string — `:3007` the review missed. A fourth turned up beside them: the comment at `:3395` cited `:2965-2991` for "the four the report names", which on the tree that wrote it pointed at the keep rail's tier and request rows. Replaced with a description, since a line citation drifts on the next insertion.
- **F3's horizontal arithmetic is unreachable on `/factory`.** `.stx-viewport` is a `min-width: auto` grid item, so the scroller's client box grows with the extent and there is never a horizontal scroll range to clamp against. Measured on the PR's base tree too (`.stx-viewport` 2818 against a 776px column), so it is **pre-existing and not #302's** — reported below, not fixed here. The vertical axis is where the drift is provable, and that is where it was proven.

---

## The checklist — 20 of 20 findings addressed

21 rows: the review files F8b under F8's heading, and it is a different file and a different fix, so it is counted separately here.

| | Finding | What happened |
|---|---|---|
| F1 | a stray `*/` deletes the selection outline | **fixed** + a running-page gate row |
| F2 | three align verbs wrong on every node they can act on | **fixed** + a DOM-free fixture and a running-page section |
| F3 | the zoom anchor drifts once the reader has panned | **fixed**, and the fix shape decided by measurement (open question 5) + a gate row |
| F4 | shipped copy still claims the link carries the arrangement | **fixed** |
| F5 | the applier aliases the op's params into the returned document | **fixed** + a gate case |
| F6 | `arrowPath` has no coverage; the overlay has no consumer | **the cheap half fixed** — 20 driven cases; the DOM half stated as owed in `gates.md` and the PR body |
| F7 | "would have passed the pixel gate" is not observed | **PR body corrected** |
| F8 | eight comments naming gates that no longer exist | **fixed**, all eight |
| F8b | the green-run summary asserts the retired `g`, three times | **fixed**, three sites + the stale citation above |
| F9 | `DRAG_SLOP` compared in stage units | **fixed** |
| F10 | `replay-driver`'s header contradicts its own new code | **fixed**, with a reachability bound the review did not have |
| F11 | `readingOrder`'s band is fixed bucketing; fixture passes vacuously | **fixed** — comment corrected, fixture now straddles a boundary |
| F12 | two modules with no runtime consumer counted as view-time code | **header corrected**; whether they should count is left open to the owner |
| F13 | `action-bus` restates another file's guarantee, wrongly | **fixed** |
| F14 | `device-presets` cites the pixel gate's width wrongly | **fixed** (the gate captures at 1280) |
| F15 | "Six product defects" — five | **PR body corrected** |
| F16 | P4 reads as fully fixed | **PR body corrected** against the module's own note |
| F17 | dead code this PR created | **fixed** — 1 binding, 1 parameter + 2 call sites, 2 inert declarations, 1 comment |
| F18 | two refusals name no value | **fixed** |
| F19 | groups 35/36 filed outside the section holding 1–34 | **fixed** — re-filed after Group 34, restyled to the file's own form |
| F20 | `vt-stack-audit`'s hazard-A scope is 2 of 7, not 3 | **fixed** |

---

## The four blocking findings, with their evidence

### F1 · `system/studio.css:236` — the stray `*/`

Line 236 closed the comment; 238–239 were then bare CSS prose ending in a second `*/`, and CSS error recovery swallowed tokens up to the next `{…}` block — taking `.stx-slot.is-selected` with it. Deleting the first `*/` puts 238–239 back inside the comment.

**A/B, Chromium, the sheet parsed and the rule's own property read as a computed style:**

```
HEAD f544b0a   rules 232  .is-selected false   computed outline: none
working tree   rules 233  .is-selected true    computed outline: dashed 2px
selectors gained: [".stx-slot.is-selected"]     selectors lost: []
```

The gained/lost pair is the control: the whole CSS sweep below changed exactly one rule, and it is this one.

**Its gate** (`tooling/studio-journey.mjs`, after the marquee rows): a selected node must compute `outlineStyle: dashed` of non-zero width **and** an unselected peer must compute `none`, both read off the same page state. Every other selection row in that file asserts through `data-stx-selected`, which a node still carries when the rule that paints it never parsed.

### F2 · `system/studio-verbs.mjs` — `h: null` on 100% of possible inputs

The align handler queries `.stx-slot[data-stx-selected]` (board wrappers; frames are unselectable), `boxOf` answers `h: null` for every wrapper, and `alignMoves`'s `h()` coerces that to 0. Fixed with a `measuredBoxOf` beside `boxOf` — `offsetHeight` is the unscaled layout height, so it lands in stage units, which is exactly what `studio-select.mjs:331` and `studio-minimap.mjs:315` already do. `snapshot()`'s `boxOf` is untouched. `renderGuides` was the same root cause and is fixed with it, on **both** sides of `guidesFor`.

**The DOM-free half** (group 13): `BV`, not `BX`. `BX`'s first and last boxes are the same height, and `distribute-v`'s middle position works out to `h_a − h_c + the span`, so on that fixture the measured and unmeasured answers **coincide** — a difference row over `BX` would have passed for the wrong reason. Measured, not reasoned about.

```
mutation: h() → 0
build verbs  ✗  3 failure(s)
  · align-bottom answered the SAME moves with h: null as with real heights ({"a":[0,400],"c":[300,400]}) …
  · align-middle …
  · distribute-v …
```

**The running-page half** (`studio-journey`, section 14): `ALIGN_VERBS` and `alignMoves` were imported at the top of that file and **never used once** — the eight verbs had no running-page assertion at all. The new section drives `ui.align-bottom` over the whole board and asserts both the page's agreement with `alignMoves` over live measured boxes and the reader's own property, one bottom line. The vacuity guard comes first: the selected nodes' rendered heights must differ. Observed on the committed board — **96, 124, 124, 144**, none carrying an authored `--h`.

**Its sequence was run standalone against both trees, because a passing row says nothing about whether it can discriminate.** Same browser, same board, PR head served beside the fix tree:

| | fix tree | PR head `f544b0a` |
|---|---|---|
| agrees with `alignMoves` over live measured boxes | ✅ | ❌ |
| every bottom edge on one line | ✅ `[144]` | ❌ `[96, 124, 144]` |
| `y` after `ui.align-bottom` | `48, 20, 20, 0` | `0, 0, 0, 0` |

PR head puts every node at `y = 0` — align-bottom aligning **tops to the bottom-most node's top**, which is F2's arithmetic on the running page rather than in a fixture.

### F3 · `system/studio-canvas.mjs` — the deferred scale, the stale extent

**Open question 5, answered by measurement.** Chromium, 4× CPU throttle, 120 ctrl+wheel events over 40 frames, two samples each:

| arm | style writes | p50 frame gap | p90 | max | frames > 33 ms |
|---|---|---|---|---|---|
| coalesced (shipped) | 120 | 16.7 / 16.7 | 17.8 / 17.9 | 21.2 / 18.4 | 0 / 0 |
| synchronous flush | 360 | 23.9 / 25.6 | 27.1 / 32.6 | 38.0 / 34.8 | 1 / 3 |

So the review's first fix — flushing before the scroll write — costs a measured 43–53% on the p50 frame gap and drops frames. **The coalescing stays and the scroll target rides with it**: `flushScale` applies the scale and then the anchored scroll offset, so the two land in the same frame, which is a stronger property than the old code had. `setZoom` reads its content point from the pending target when there is one, because a pinch is many calls inside one frame. `fit()` and `reset()` clear the pending anchor and keep their synchronous zeros — 0 is inside every extent, so no flush can clamp it away.

**A/B on the running page**, after a pan, vertical axis:

```
PR HEAD f544b0a   wanted scrollTop 744, got 594 → 150 screen px drift, 115 stage px of content slide
fixed             wanted scrollTop 744, got 744 → 0 screen px, −0.4 stage px (sub-pixel)
fixed, pinch      120 style writes, p50 16.7 ms, 0 frames over 33 ms — coalescing retained
```

**Its gate**: AC #3's actual claim, asserted as *where*. The reader has to have panned first — at `scrollTop` 0 the anchored target is 0 whatever the code does, which is why this was invisible — so the row pans, asserts the pan really happened, then asserts the stage point under the cursor is still under it.

### F4 · `system/studio-keep.mjs` — the honesty contract

`SHARE_NOTE` dropped the middle clause and states the retirement rather than merely omitting it, because a reader who copied a link before v3 has reason to look for the difference. The header above it records what the sentence used to say and why the rest of the retirement landed without it.

The sentence opened "The whole build travels in the link itself" and now opens "The link itself carries the build": a promise of wholeness followed by an exception reads worse than no promise, and invites the reader to wonder what else is missing.

**This churns the `/factory` pixel baselines** — `SHARE_NOTE` renders at rest inside a full-page capture — so the regen rides in this PR.

---

## Everything else, briefly

- **F5** `clone(checkOp(op))`. Before: `doc.frames[0].composition === op.params.composition` was `true`, and editing the returned document rewrote the op record. After: both `false`. Group 35's purity case tested the document, not the params; the new rows assert by **identity** first, because a deep compare passes on an alias.
- **F6** 20 `arrowPath` cases, endpoints **derived** (each must land on its own box's boundary) rather than typed. Mutating `Math.min(tx, ty)` → `max` reds 14 of them. The overlap test is driven at both sides of `ta + tb >= 1`, with a one-pixel gap as the positive control.
- **F9** the slop is converted into stage units at the comparison (`DRAG_SLOP / scale`), so it stays 4 screen px at every scale instead of 0.4 px at the floor and 16 px at the ceiling.
- **F10** the header states the exception — `relayout()` is a layout correction, not a move, and enters no history — **and its bound**, which the review did not have: `relayout()` runs only from `reflect()`, `reflect()` only from `advance()`, and a take-over sets `tookOver`, calls `pause()` and disables step, skip and seek together. So no beat can play and no op can reflect once the canvas is the visitor's, and **the consequence the review names is not reachable**. If a later ticket gives the transport a path that survives a take-over, the exception has to be gated rather than restated.
- **F11** both mutation directions red their own row by name: a 4× band fails "one pixel apart must read as two rows", a ¼ band fails "139 px apart must read as one row". The original fixture (y 0 vs y 20) sits inside one bucket and could not tell.
- **F17** `const g = pickUp(…)` at the keyboard site was bound to nothing (the pointer site at `:1280` genuinely uses its `g`, so only one of the two was dead); `renderSummary`'s `arranged` parameter and both call sites' argument; `align-self`/`justify-self` on `.stx-menu` and `.stx-frame`, inert on absolutely-positioned children of a plain block stage — verified, `.stx-stage` declares no `display`.

---

## Gates

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | `build ✓ all 36 groups pass`, exit 0 |
| `node tooling/token-lint.mjs` | `✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid` |
| `node tooling/drift-check.mjs` (staged) | `✓` thirteen legs |
| `PORT=4788 node portal/server.mjs` + `/api/health` | `{"ok":true,…}` |
| `node tooling/studio-journey.mjs chromium` | **`── chromium: 533 passed, 0 failed`**, exit 0 — run 6, on the committed tree at `36c7d52` |
| `npm run update:docker` | 6 baselines rewritten, and nothing else churned — see below |

`loc-summary` moved **31,500 → 31,600** in the runtime group once the changes were staged (`gen-loc` reads git-tracked content, so a `--check` before staging is a false pass). **Six baselines, not four:** this PR added `verdant` as a third pack, so `approach` churns on the rendered number and `/factory` on F4's copy, across neutral · saulera · verdant.

### The first journey run found a defect in one of these gates

`studio-journey chromium` run 1 reported **382 passed, 1 failed** — and the failure was `chromium threw: browserContext.newPage: Target page, context or browser has been closed`, not an assertion. Section 14 was appended after the fit block, which is three sections past `await ctx.close()` at `:4933`; the fit block runs in its own `fctx` for exactly that reason. So the new align section threw at its first `newPage`, the engine stopped there, and **every row after it was silently absent from a run that otherwise looked green**. It now opens and closes its own context, and the comment says why.

That is this review round's own finding restated: a check that cannot fail, and a total that cannot tell you what did not run. The two rows that had already printed passed — `#302/F3 · …it zooms TO THE CURSOR after a pan` and `#217/AC1 · …the selection is actually PAINTED`.

### The driver: green on run 6, after five machine-bound failures

**Run 6 is the one that counts: `── chromium: 533 passed, 0 failed`, exit 0**, driven against the committed tree at `36c7d52` once the machine was quiet (1-minute load 1.95, down from 3.67; the Lima VM at 25%, down from 70%). **533 is 525 + exactly the eight rows this round adds**, and all eight printed ✓ — including section 14, which had never executed in any earlier attempt. The corrected summary line is what a green run now prints: zero matches for `WITH ITS ARRANGEMENT`, `CARRIES the arrangement` or `g-restore` in the run's own output.

The five failures before it are kept here rather than deleted, because one of them was real and the other four are the reason a total is not evidence.

**Five runs, five different stopping points, always the same thing and never an assertion:**

| run | rows before the stop | where |
|---|---|---|
| 1 | 382 | `browserContext.newPage: … has been closed` — **a real defect in my own new section**, fixed (below) |
| 2 | 205 | `[data-replay="settled"] never arrived within 30000 ms`, beat 24/28 |
| 3 | 123 | same, beat 15/28 |
| 4 | 187 | same, beat 13/28 |
| 5 | 101 | same, beat 15/28 — on a freshly restarted server |

Runs 2–5 are a **replay that did not finish inside the driver's own 30 s budget**. Three measurements say the cause is this machine, not this tree:

- a Lima/Docker VM held **70.6%** of the CPU at run 2 and 39–43% after, with 1-minute load averages of 2.2–3.7;
- the replay settles in **~14.6 s** on a quiet page, less than half the budget;
- **the A/B is the decisive one.** PR head served beside the fix tree, interleaved so drifting load hits both arms: fix tree **14,577 / −/ 14,591 ms**, PR head **14,613 / 14,731 / 14,599 ms**. The fix tree is marginally **faster**. One fix-tree sample did hang past 40 s, which is the same intermittency the driver keeps meeting.

Nothing in this round touches replay pacing either: `measuredBoxOf` runs only inside a carry or an align verb, `pendingAnchor` only on a zoom, the slop only inside a marquee, and `canvas-ops.mjs` is loaded by no page.

While those five stood, the new rows were verified individually rather than inferred from a total — the F3 anchor pair in runs 2–5, the F1 `PAINTED` row in runs 1 and 3, and section 14 standalone against both trees with PR head failing it (the table under F2). Run 6 then re-observed the whole suite green, so that stands as the gate and the standalone work stands as the discrimination evidence. **The gate's timeout was never touched** — raising it to get a pass is the thing this whole round is about.

**The regen is also the control on one of this round's claims.** F17 deleted `align-self` / `justify-self` from `.stx-menu` and `.stx-frame` as inert on absolutely-positioned children of a plain block stage (`.stx-stage` declares no `display`). If that reading were wrong, `.stx-frame` would move at rest and baselines beyond `factory` and `approach` would churn. **Exactly six changed** — `factory` and `approach` across neutral · saulera · verdant — and nothing else, so the inert reading holds and F1's restored rule moved no at-rest pixel either.

Two notes on getting there. `approach` did **not** rewrite on the first pass: `31,500 → 31,600` is a one-glyph change and `maxDiffPixels: 100` swallows it, so the gate passed while the committed baseline showed a number the page no longer renders — the same "check that cannot fail" shape, in the gate's own tolerance. Forced with `rm`. And `factory · verdant` failed its first update with `Failed to re-generate expected. Timeout 5000ms` — the two-consecutive-stable-shots window losing to the same CPU contention; it rewrote cleanly at `--workers=1` in 22.3 s.

---

## The five open questions — answered 2026-09-21

All four of the owner's calls were "close it". Each was **verified open first** against the shipped applier, then closed, then re-verified by the same probe — the review carried Q1–Q4 without checking them, and all four were real.

| | Observed OPEN | Owner's call | Now |
|---|---|---|---|
| **Q1** a state of a state | `f3` a state of `f2`, itself a state of `f1`; `missingStates` still reported `f1` as missing three | refuse by name | refused, naming the base, the word SCREEN and `missingStates` |
| **Q2** duplicate `(baseId, stateKey)` | `f2` and `f3` both `(f1, "error")`; the floor check counted them as one | refuse a second one | refused, naming the twin's id |
| **Q3** exactness one level down | `{frameId: "f1", bogus: 1}` stored verbatim, while the same key on the op was refused | close it | `ENDPOINT_KEYS` frozen beside `PARAMS`; `partId` is `from`'s alone, driven as its own refusal |
| **Q4** `canvas.json`'s derivation claim | `$description` said positions come from the rank layout; `f2.x` is 472 where the pitch is 236, and `f2` is a *state*, which that layout has no concept of | correct the claim | the file now states exactly what is derived (every node, edge, id, width and ref, replayed by group 36) and that **positions are authored**, which is what group 36's inverse case already assumed |
| **Q5** the pinch cost | — | — | answered by measurement in F3 above; nothing owed |

**Q2 exposed a defect in group 35's own positive control.** Its setup minted `f2` with a `state.add`, so the loop then applied `state.add`'s minimal op to a document that already carried that pair. Invisible while duplicates were legal; a red control the moment they were not. It composes a second screen instead — every verb's minimal op now meets a document that owes it nothing.

Four new refusal cases, each driven by a broken op and matched on what it must name. Mutating all three refusals away reds exactly those four, by name.

## Not fixed, and why

- **F12's second half** — whether a module with no runtime consumer should count against the total `approach.html` renders before #306 lands. The header now states the reason truthfully; the accounting decision is not a review fix.
- **`.stx-viewport` blows out of its grid cell** (new, not in the review). The scroller's client box is **3172** against a **776px** column, clipped by `body { overflow-x: clip }`, so the canvas has no horizontal scroll range and part of it is unreachable. Measured at **both 1440 and the pixel gate's 1280**, and on the PR's **base tree** (2818 against the same 776) — so it is pre-existing and not #302's. Out of scope here; worth its own ticket. F3's gate row records it as a measurement with the condition that retires it, not as a standing property, so the X axis gains an assertion the day the blowout is fixed rather than keeping a note that has quietly gone false.
- **`.claude/plans/canvas-swap-grid-retired-free-substrate-302.html`** and two sibling `.html` plans are untracked in this shared worktree and are not mine to commit; the `.md` they render is already tracked.
