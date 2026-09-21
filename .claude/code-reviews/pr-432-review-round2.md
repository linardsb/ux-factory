# PR #432 review — round 2 (the grid retired: a free substrate, `canvas-ops.mjs`, MVP 14's spine, #302)

**Head** `a10a3d0` · **Base** `main` @ `287445e18cb34333ad8fb8580fe8ec4e55856e77` · **Round** 2 · **State** OPEN · **mergeStateStatus** CLEAN

**The base did not move.** Round 1 recorded the same `287445e1`, so the guarantees pass has no trigger this round and nothing below is a rebase casualty.

**Recommendation: request changes** — 2 high, 1 medium, 5 low. **No code defect blocks.** Both highs are claims the PR makes about itself that a single command refutes, and both sit on the surfaces this repo's honesty contract names as hard. The twenty round-1 fixes are real and I mutation-tested the ones that carry a discrimination claim; the four open questions are closed the way the owner ruled.

**Scope.** The delta is `f544b0a..a10a3d0` — four commits, 1,162 insertions: `36c7d52` (the twenty fixes), `81a9389` (docs), `37e76f9` (the four open questions closed), `a10a3d0` (docs). The pre-round-1 tree was reviewed in round 1 and is not re-read line by line here.

**Provenance.** Findings I verified by running something are unmarked. Findings I am carrying without independent verification are marked **†**. Deep file analysis was dispatched to a second reviewer in a clean context; its mutation results are reproduced below with the mutation named, and I have marked which of its conclusions are reasoning rather than execution.

---

## High

### F1 · the Validation table's three engine figures are not this tree's, and two of them are arithmetically impossible
PR body, **## Validation**, under the heading *"All observed on the final tree"*

> `node tooling/studio-journey.mjs all` → **chromium 525/0 · firefox 521/0 · webkit 521/0**

All three are `f544b0a`'s numbers, recorded in `.claude/reports/canvas-swap-grid-retired-free-substrate-302-report.md:614`. Round 2 adds **eight** rows to `tooling/studio-journey.mjs`, and none of them is engine-gated — the eight `t(` calls in the delta carry no engine predicate, and the passes that hold them are invoked unconditionally (`:1705-1712`, `:2805-2807`; the only engine gate in the file is the CDP frame check inside `perfPass`, which is what the table's own "4-row gap" parenthetical is about).

So on this tree firefox and webkit must read **529**. 521 cannot happen. And the body contradicts itself twenty lines further down, where the round-1 section reports chromium at **533** — the number the fixes report also gives, for run 6 on `36c7d52`.

**The substantive half is firefox and webkit.** `.claude/reports/pr-432-review-fixes-report.md` names them **zero** times. The round-1 fixes changed CSS comment structure and therefore sheet parsing (F1), the rAF/scroll ordering on the zoom path (F3), a pointer threshold (F9) and a geometry read (F2) — the four classes this repo's own memory says a single engine cannot speak for, and three-engine green is this driver's own stated standard everywhere else in the PR.

This is not a nit about a digit. The table is the PR's answer to "did the gate that owns this pass?", it says *observed*, and for two engines no run exists.

**Fix:** run `node tooling/studio-journey.mjs all` on `a10a3d0` and put the three real numbers in the table. If firefox or webkit is red, that is the finding; if they are 529, the table gains the thing it currently asserts without evidence.

### F2 · "`gates.md` now says so" — it does not
PR body, **## Still outstanding**, and `.claude/reports/pr-432-review-fixes-report.md`'s F6 row

> "`arrowPath` itself is pure and total, and review round 1 added its cases to build-checks group 12; the DOM half stays owed and **`gates.md` now says so**."

**Observed.** `grep -in 'setArrows\|overlay\|arrowPath\|#306' .claude/references/gates.md` returns one hit, at `:167`, which is `vt-stack-audit`'s use of the word "overlap". The round-2 diff to that file is **5 insertions, 10 deletions**, every one of them F19's re-file and F20's scope correction. Nothing about the arrow overlay was added.

The clause exists in exactly one place — `tooling/build-checks.mjs:2847`, group 12's own `group()` string, where it is well written:

> "…and the whole DOM half of the arrow overlay — the SVG layer, its marker def, the MutationObserver and `setArrows`, which has NO CALLER anywhere in this repo until #306's live page, so no running-page row and no pixel reaches any of it either"

So the limitation is recorded where a green run prints it, and absent from the file CLAUDE.md sends a reader to **before trusting a green run**. `gates.md`'s Group 12 paragraph (`:23`) still describes the group as it stood before the 20 `arrowPath` cases landed — it names `setPos`'s 11 hostile inputs and the four node families and stops there.

This is the failure mode the round-1 review's own F8 was about, and the one the repo has already recorded as *gate prose has three copies*: the `group()` string and the `gates.md` entry drifted apart, and the PR body asserts they did not.

**Fix:** two sentences in `gates.md`'s Group 12 paragraph — the `arrowPath` cases and the overlay's "cannot reach" clause — or, if the paragraph is meant to stay short, change the PR body and the fixes report to say where the clause actually lives.

---

## Medium

### F3 · a fourth site of F8b's class, in the header of the very function whose arrangement rows P5 retired
`tooling/studio-journey.mjs:2991`

`keepPass`'s section comment, which divides what group 17 owns from what this pass owns:

> "…that group owns the STRING the exporter produces, and this owns whether a browser really hands a file over, whether the tiers really hide, **whether the address bar really carries the arrangement**, and whether the declined mount really leaves a live Compile button."

`g` is retired, the arrangement does not travel, `keepPass`'s two arrangement rows were retired by P5, and nothing in this pass asserts the clause any more. It is the same split F4 and F8b are about — the assertions went and the paragraph describing them stayed — at a fourth site, in the header of the function the other three were in.

It predates this PR (`b90ec55`, #241) and was made false by it, which is exactly the scope round-1's F8 used.

**Fix:** drop the clause, or restate it as the retirement the way P5's rows already do.

---

## Low

- **F4 · F9's fix has no gate of any kind.** `DRAG_SLOP` (`system/studio-select.mjs:568`) is unexported and DOM-only, and `grep -n DRAG_SLOP tooling/build-checks.mjs tooling/studio-journey.mjs` returns nothing. Of the round-1 fixes that could carry a discrimination claim, this is the only one with no verification surface at all, and the fixes report does not claim one — so it is honest, just uncovered. Worth one journey row asserting that a Shift-click at the 0.1 floor still *adds* rather than replaces.
- **F5 † · `measuredBoxOf`'s `|| 0` can silently restore the bug it fixes.** `system/studio-verbs.mjs:398` — `h: Number.isFinite(b.h) ? b.h : (node.offsetHeight || 0)`. If `offsetHeight` ever reads 0 at that moment, `alignMoves` gets exactly the shape F2 was about, with no refusal and no announcement. The second reviewer looked for a live path and found evidence against one — the canvas mount carries no `hidden` in `factory.html`, and the handler only acts on already-selected `.stx-slot`s — so **reachability is unproven rather than demonstrated**, which is why this is Low and not High. `fit()` at `studio-canvas.mjs:441` already has the honest posture for an unmeasurable read (say so rather than coerce a number).
- **F6 † · `clone(checkOp(op))` adds an unnamed throw.** `clone` is `structuredClone`, verified to preserve explicit `undefined` (so no silent JSON-round-trip loss — this is the right fix for F5). It throws `DataCloneError` on a function or symbol anywhere inside `op.params`, with a message naming no path, against this file's own convention that its other seventeen refusals follow. Unreachable from JSONL; reachable from a JS caller composing an op, i.e. #306.
- **F7 · the fixes report's correction of the review is itself wrong at the granularity it uses.** It says *"F8b named `:3347`, which is already correct on this tree"*, and then separately reports *"a fourth turned up beside them: the comment at `:3395`"*. **Observed:** `f544b0a:3347` reads `// are at :2965-2991 and in studio.mjs, keepPass's g-restore row and param-manifest.json). These` — it carries `g-restore` and the stale line citation, and is the same comment that the fixes moved to `:3398` on this tree. The review's citation pointed at a real stale line; the report calls it wrong and then fixes it under another number. No code consequence — the fix landed either way.
- **F8 · two figures that do not survive re-derivation.** (a) PR body: *"fix tree median **14,577** ms to settle"*. The fixes report's table gives two fix-tree samples, `14,577 / — / 14,591`; 14,577 is the **minimum**, the median of two is 14,584. The conclusion — the fix tree is marginally faster — is unaffected. (b) The fixes report's *"`loc-summary` moved 31,500 → **31,600**"* is the state at `36c7d52`; `37e76f9` moved it to **31,700**, which is what the tree carries. The report reads as the PR's final state and there is no commit scoping on that line.

---

## Notes, not findings

- **The three new refusals guard the op-replay path only.** A `canvas.json` loaded directly, rather than derived by replaying `ops.jsonl`, can still carry a nested state or a duplicate `(baseId, stateKey)`, and `missingStates` walks base frames so it would miscount silently. `canvas-ops.mjs`'s header says the op-time refusal "is the only place that can tell", which is true of the ops path and does not cover a hand-edited document. Almost certainly by design — ops are the stated write path — but worth the one clause, since #306 is what loads a document.
- **F12's second half is still open and correctly labelled.** Whether a module with no runtime consumer counts against the total `approach.html` renders is the owner's call; the header now states the reason truthfully and says so.

---

## Validation — observed on `a10a3d0`, in an isolated worktree

| Command | Result |
|---|---|
| `node tooling/build-checks.mjs` | **`build ✓ all 36 groups pass`**, exit 0 — and this worktree has **no `portal/node_modules` at all**, which confirms the PR body's parenthetical independently |
| `node tooling/drift-check.mjs` | **✓** — thirteen legs, named: syntax · token-css · annotated-source · loc-summary · param-count · system-graph · inspect-data · inspect-mounts · handoff · scenarios · traces · replay · group-count |
| `node tooling/token-lint.mjs` | **✓ 63 contract tokens · 0 undeclared · 0 orphan · DTCG valid** |
| `node agent-layer/gen-loc-summary.mjs --check` | **✓ 3 groups — no drift** |
| `node agent-layer/gen-param-count.mjs --check` | **✓ 121 controls — no drift** |
| `gh pr checks 432` | **6/6 pass**, on this exact SHA — audit · codeql · CodeQL · gates-green · verify · visual |
| `gh pr view --json mergeStateStatus` | **CLEAN**, base still `287445e1` |
| `node tooling/studio-journey.mjs all` | **in flight at the time of writing** — 297 rows into chromium, zero failed. Reported separately when it lands; F1 does not depend on it |

**Re-derived rather than taken from the report:**

| Claim | Check |
|---|---|
| AC #1's seven-symbol DoD grep → 0 | **0** over `system/`, `tooling/` and every `*.html` ✓ |
| `data-zoom` gone as a mechanism | one hit, a historical clause in `studio-canvas.mjs:370` ✓ |
| F8 · `GRID_FAMILIES` retired | **0** in `tooling/build-checks.mjs`; both citing comments rewritten ✓ |
| F8b · the three stale summary sites | fixed; the only surviving repo-wide match is F3 above ✓ |
| F13 · the v2 refusal is the **version** check | `build-share.mjs:303` carries that exact string; the `g` refusal is `:311` ✓ |
| F14 · the pixel gate's width | **1280** at `visual.spec.mjs:203,209,242`; **zero** occurrences of 1440 under `tooling/visual-regression/` ✓ |
| F19 · groups 35/36 re-filed | now `**Group 35 —` / `**Group 36 —` at `gates.md:59,61`, inside the 1–34 section, in the file's own style ✓ |
| F20 · hazard A's scope | now "`/index`, `/roundtrip` and `/factory` (3 of the 7…)" ✓ |
| the four open questions closed | 15 refusals → **19**; `ENDPOINT_KEYS` frozen at both levels ✓ |
| F3's "43–53%" | 23.9/16.7 = +43.1%, 25.6/16.7 = +53.3% ✓ arithmetic sound |
| the baseline cascade | `37e76f9` moved `loc-summary` **and** regenerated the three `approach` baselines in the same commit ✓ — and CI's `visual` is green on this SHA, which is stronger than a local Docker run |
| "33 files, exactly 15 written" | **33** in `baselines/`; **15** distinct baseline paths in the PR's file list (11 new verdant + 4 modified) ✓ |

**Mutation-tested — every fix that carries a discrimination claim:**

| Fix | Mutation | Result |
|---|---|---|
| F6 `arrowPath` | `Math.min(tx,ty)` → `Math.max` | **red**, exit 1, **14** failures, each naming its own geometry — the fixes report's own count, reproduced |
| F11 `readingOrder` | `Math.floor` → `Math.round` in the band compare | **red**, 2 rows — and the *old* fixture (y=0 vs y=20) is confirmed **not** to catch it |
| F5 `canvas-ops` alias | `clone(checkOp(op))` → `checkOp(op)` | **red**, 3 alias assertions, one showing the mutated composition leaking back into `op.params` |
| Q1 · a state of a state | the `if (base.baseId)` block removed | **red** — "must name `f2` and `sibling of a SCREEN` and `missingStates` — got NO THROW" |
| Q2 · duplicate `(baseId, stateKey)` | the `twin` check removed | **red** — "must name `already carries` and `f2` and `distinct keys`" |
| Q3 · unknown key in `from`/`to` | the `ENDPOINT_KEYS` loop removed | **red**, 2 cases, both by name |
| F2 `BV` vs `BX` | both fixtures driven through the real `alignMoves` | `BX` answers **identically** for real heights and `h: null`; `BV` **differs on all three verbs** — the report's "measured, not reasoned about" holds |

Tree confirmed clean after every mutation.

**Verified by reasoning or simulation, no defect found:** `pendingAnchor`'s multi-call composition (a standalone simulation of the `setZoom`/`flushScale` algebra over 2- and 3-call sequences with a drifting anchor converges **exactly** on what an eager flush would produce — the pinch case composes correctly); `flushScale`/`queueScale` have no callers outside `studio-canvas.mjs`; `DRAG_SLOP / canvas.scale` reads the same live getter `pointOnStage` does, synchronously, so they cannot disagree; `renderGuides`'s `carried` builds new objects and cannot leak into `applyBox`'s cancel write; `structuredClone` leaves `next.frames[i]` unaliased; a comment-balance scan of the **whole** of `studio.css` finds no other unbalanced comment, and `.stx-stage` declares no `display` in either its base rule or the reduced-motion block, which is the `align-self` removal's premise.

---

## A trap this round walked into, recorded because it nearly became a finding

My first three-engine run reported `chromium: 530 passed, 3 failed` — three `#221` minimap rows asserting that `/factory` has no horizontal scroll range. **It was driving the wrong tree.** Port 4791 was already held by a sibling session's server (PID 43989; mine was 32653), rooted at `fix/factory-canvas-width-pin-433` — a branch that sits **on top of** this PR and whose `3f95d83` deletes `.stu-shell .stx-viewport { width: max-content }`, which is exactly the pin those three rows are shaped by.

The standing guard — curl an edited file before trusting a served tree — **did not catch it**, because a stacked branch carries this PR's edits too. What catches it is a marker that exists on this head and *not* on the branch above it: `studio.css:530` still carrying #214's pin, with zero hits for `#433`'s replacement comment. The re-run is bound to a port whose listener PID matches the one I started.

Nothing in the PR is at fault here. It is recorded because the three red rows read exactly like a regression in this PR, and the note in `a10a3d0` predicts the flip precisely — "when that lands a horizontal range appears, and this row should gain an X-axis assertion". That prediction is now verifiable: on the #433 tree the rows are red, which is the condition retiring them, and #433 rewrites them.

---

## What is good

- **The four open questions were verified OPEN before being closed, and re-verified after.** All four were real. The owner's call is recorded per question with the date, and the refusal messages name the twin, the base and `missingStates` rather than saying "already has one".
- **Q2 exposed a defect in group 35's own positive control** — the setup minted `f2` with a `state.add`, so the loop then applied `state.add`'s minimal op to a document that already carried that pair. Invisible while duplicates were legal, red the moment they were not. Composing a second screen instead is the right floor, and finding it this way is the discipline working.
- **F2's fix was chosen by measurement, not by the review's suggestion.** The review said "add a `BX` case with `h: null`"; the author measured that `BX`'s first and last boxes are the same height, so `distribute-v`'s answer coincides — a difference row over `BX` would have passed for the wrong reason — and built `BV` instead. I re-ran both fixtures and the coincidence is real.
- **F3's fix rejected the review's own prescription on evidence.** Flushing before the scroll write costs a measured 43–53% on the p50 frame gap and drops frames; the coalescing stays and the scroll target rides inside `flushScale`, so scale and scroll land in the same frame — a stronger property than the code had before. The simulation above confirms the composition is exact.
- **The five failed driver runs were kept rather than deleted,** with the A/B that shows the cause was the machine and not the tree, and with the note that one of the five was a real defect in the author's own new section. "A total is not evidence" is the right lesson and it is written down.
- **The `.stx-viewport` blowout was measured on the base tree before being disowned,** filed as its own ticket, and the gate row records it as a measurement with the condition that retires it rather than as a standing property. That is the honest shape, and F3-the-finding above is the same discipline applied to a fourth stale clause.
- **F17's dead-code removal used the pixel gate as its control** — if `align-self` were not inert, baselines beyond `factory` and `approach` would have churned. Exactly six changed. That is a real experiment, not an assertion.

---

## Suggested order

**Before merge:** F1 and F2. F1 needs a three-engine run and the table rewritten to whatever it says; F2 is two sentences in `gates.md`. Neither touches code.

**Cheap and the same class, worth landing with them:** F3's one clause, and F8's two figures.

**The owner's call:** F4's journey row is the only one that adds coverage rather than correcting prose, and it is the one gap where a round-1 fix has nothing watching it. F5, F6 and F7 are notes.
