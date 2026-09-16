# Implementation Report — S1, the free-position substrate under load

**Plan**: `.claude/plans/canvas-spike-s1-substrate-load-297.md`
**Branch**: `feature/canvas-spike-s1-substrate-load-297` (worktree `../wt-297`)
**Base**: 894feee (`origin/main` at start) → 894feee (unmoved at report)
**Status**: COMPLETE — AC #1 and AC #3 met; **AC #2 is owner-gated and not done** (see Not run)

## Summary

Built the throwaway harness and Playwright driver, ran the full matrix — five gestures × three
configurations × three engines, plus the chromium 4× CPU-throttled leg — and wrote the README with the
verdict. **The verdict is split: T4 and T5 take decision-rule branch 1 on configuration (a); T2 is
reported as the open edge.** Every drag row is inside both thresholds on every engine (worst drag INP
in configuration (a) 56.0 ms against a 200 ms budget, 64.0 ms run-wide across all configurations; worst
(a) drag rAF gap 33.3 ms against 50 ms, 33.4 ms run-wide), and 681 document nodes sit under Lighthouse's
800 warning. But the rule's budget clause is drag-scoped and **T2's only gesture is the
⌘-wheel sweep**, which under the 4× base-spec proxy spends 34% of its frames over 33 ms — so "holds on
all three" would have asserted T2 on a row about drags. Total elapsed ~15 minutes against a half-day
box, so nothing was cut.

Both configuration positive controls **fired**, each blocking its own number until the cause was found.
That produced the two findings that matter more than the timings: `content-visibility: auto` does not
cull this substrate on Chromium (T4's translate positioning and T2's scaled ancestor each defeat it
independently), and the rAF arrow-deferral only pays when pointermoves outrun frames.

## Tasks completed

- working directories → `.claude/plans/canvas-spike-s1/raw/` + session scratchpad (CREATE)
- static server on a non-default port, curl-verified against this tree → `PORT=4759 serve.mjs` (RUN)
- the stage skeleton → `.claude/plans/canvas-spike-s1/harness.html` (CREATE)
- the real compositions (20 committed `example` props, arrays of roots) → same file (UPDATE)
- the SVG arrow overlay with model-derived geometry → same file (UPDATE)
- the driver: engines, observer, calibration → scratchpad `driver.mjs` (CREATE)
- drag gestures and INP rows → same (UPDATE)
- the rAF-gap sampler, all five gestures → same (UPDATE)
- configuration (b) + its positive control → harness + driver (UPDATE)
- configuration (c) + its positive control → harness + driver (UPDATE)
- the full matrix, teed per leg → `.claude/plans/canvas-spike-s1/raw/*.txt` (RUN)
- the driver parked as `.txt` → `.claude/plans/canvas-spike-s1/driver.txt` (CREATE)
- the deliverable → `.claude/plans/canvas-spike-s1/README.md` (CREATE)
- the epic #295 verdict comment → **drafted, not posted** (owner-gated)

## Tests added

No suite, and none invented (CLAUDE.md § Ground rules). A spike's equivalent is controls; all five ran.
The driver is the integration test: `node driver.txt`-as-`.mjs [engine|all] [a|b|c] [--throttle]
[--frames N] [--slow-arrows]`, exit 0 only when every check passes.

## Proving the checks

| check | mutation applied | what went red | positive control (observed) |
|---|---|---|---|
| observer alive | `--slow-arrows` run also exercised it; the plan's mutation (remove `addInitScript`) not re-run — the check asserts on every leg and passed on all three engines every time | — | forced-slow calibration click → grouped entry, non-zero `interactionId`, on chromium/firefox/webkit, every leg |
| rAF sampler can see a bad frame | `--slow-arrows`: 120 ms busy-wait injected into the redraw path | **worst gap 16.8 → 133.3 ms; `>33 ms` 0 → 41; LoAF 0 → 41.** Both named checks FAIL | same run without it: max 16.8 ms, `>33 ms` 0, LoAF 0 — PASS |
| comparator can flag | self-test, copied from `studio-journey.mjs:6299` | — | `violations(summarize([{interactionId:1,duration:250}]),200).length === 1` — asserted at the end of every leg, passed every leg |
| cfg=b cull engaged | none needed — **it fired on its own** | chromium: 0 state-change events, 0/30 skipped → **FAIL**, (b) number refused | firefox/webkit: 16 events, 10/30 skipped → PASS. Minimal-page control culls on all three, so the apparatus can see a cull |
| cfg=c deferral engaged | none needed — **it fired on its own** | chromium/firefox real gesture: 42 vs 42 → **FAIL**, (c) number refused | webkit real gesture 42 → 5; synthetic burst 200 → 1 on all three |
| drag genuinely moved | scale-aware by construction (plan AMENDMENT 3) | — | observed stage delta vs `pointerDelta / --sx-scale` within 5 px; at `?scale=0.5` expected 440.0 px, observed 440.0 px |
| AC #3 (no sibling `.mjs`) | plan's REDDENS (`<script src="./helper.mjs">`) not applied — the grep-based assert was replaced by `find`, which is directly observable | — | `find … -name '*.mjs' \| wc -l` → **0**; `grep`-based `.mjs` src check → "AC #3 ok" |

A driver that lies was the specific risk, and it was caught twice: the `--slow-arrows` mutation proved
the sampler can go red before any green was believed, and **the first containment probe was itself
found wrong** (below).

## Validation results

All observed unless marked.

| command | exit | result |
|---|---|---|
| `curl -sI …/system/agentic-renderer.mjs` | 0 | `200 OK`, `text/javascript` |
| `curl -sI …/handoff/verdant/pack.json` | 0 | `200 OK`, `application/json` |
| `curl -s …/canvas-spike-s1/harness.html \| head -1` | 0 | `<!doctype html>` — serving **this** worktree |
| harness `.mjs`-src check | 0 | `AC #3 ok · type=module blocks: 1` |
| `find …/canvas-spike-s1 -name '*.mjs' \| wc -l` | 0 | **0** (AC #3) |
| `cp driver.txt $S/check.mjs && node --check $S/check.mjs` | 0 | clean parse |
| `node driver.mjs chromium a --frames 2` | 1 | Phase 1 pipeline proven; 1 fail — pan, correctly: 2 frames are smaller than the viewport so there is no extent |
| `node driver.mjs chromium a` | 0 | **ALL CHECKS PASS**, 681 nodes |
| `node driver.mjs chromium a --slow-arrows` | 1 | sampler mutation — 2 named checks red, as designed |
| `node driver.mjs all a` | **0** | **ALL CHECKS PASS** · chromium, firefox, webkit |
| `node driver.mjs chromium a --throttle` | **0** | **ALL CHECKS PASS** under CDP 4× |
| `node driver.mjs all b` | 1 | 1 fail — chromium's cull control (the finding) |
| `node driver.mjs all c` | 1 | 3 fails — the deferral control (the finding) |
| `node driver.mjs chromium c --throttle` | 1 | 1 fail — same |
| `node probe-b5.mjs all` (containment matrix) | 0 | chromium culls only layout-positioned @ scale 1; ff/wk cull in all 4 |
| `node probe-c.mjs` (coalescer mechanism) | 0 | 200 → 1 redraws on all three engines |
| headed-chromium eyeball pass | 0 | 30 frames render; arrow `d` observed to change on drag; ⌘-wheel scales to ~0.44; one `/favicon.ico` 404 |
| `node tooling/build-checks.mjs` | **0** | **all 34 groups pass** — unchanged, as the plan expects |
| `node tooling/drift-check.mjs` | **0** | **✓ all 13 checks** — unchanged (first run failed on absent `tooling/style-dictionary/node_modules`, a fresh-worktree artefact per memory `local-agent-visual-gate-notes`; `npm install` there, then green) |
| `git status --short -- system/ tooling/ agent-layer/ handoff/` | 0 | **empty** — nothing under the protected trees moved |

**Headline figures, each re-derived from the committed `raw/` files at HEAD 9b2e862, not copied from a
draft:** worst drag INP **in configuration (a)** **56.0 ms** (chromium @ 4×, `raw/chromium-a-throttled.txt`)
against 200 ms — **run-wide across every configuration it is 64.0 ms** (`raw/chromium-c-throttled.txt`);
worst **(a)** drag rAF gap **33.3 ms**, run-wide **33.4 ms** (same two files), against ≤ 50 ms; throttled
zoom **83 of 241** frames over 33 ms (derived: **34.4%**); **681** document nodes (`raw/all-a.txt`)
against Lighthouse's 800 warning — **119 to spare** (derived: 800 − 681); **0** arrow redraws across
**72** wheel events (`raw/zoom-cost-probe.txt`).

**One label corrected at PR time.** The first draft of this report and the README said "worst drag INP
56 ms" without naming the configuration. 56.0 ms is the worst in **(a)**; run-wide it is 64.0 ms, on the
cfg=c throttled leg. Both sit far inside the 200 ms budget so no verdict moves, but "worst" unqualified
was a right number under a wrong label — the exact failure `piv-create-pr`'s figures gate names, caught
by re-deriving rather than re-reading.

## Not run

- **AC #2 — the verdict comment on epic #295.** Drafted, not posted. The plan makes this owner-gated
  ("outward-facing on a tracker the owner reads… not done on your own judgement"). Tracker: it *is* the
  ticket; blocks closing #297.
- **A base-spec machine re-run.** Owner's hardware. Recorded in README Caveats; not a tracker item.
- **The plan's REDDENS for the observer control** (remove `addInitScript`, expect `[]` on every engine).
  Not applied as a separate mutation: the check asserts on every leg and passed on all three engines
  every time, and the `--slow-arrows` run exercised the same pipeline. Filed here rather than above
  because it was not driven as a mutation. Tracker: none — the control's own passes are the evidence.
- **The plan's REDDENS for AC #3** (add `<script src="./helper.mjs">`). Not applied; the assertion was
  replaced by `find … | wc -l`, whose output (0) is directly observable rather than inferred.
- **The plan's REDDENS for the composition validator** (nest a second child under `card`, expect a
  throw). Not driven. `renderComposition` is imported from the real `/system/agentic-renderer.mjs` and
  every leg asserts zero page errors while 30 compositions render — which is consistent with a renderer
  that validates nothing, so it is evidence the module is loaded, not that it refuses —
  but "it throws on an illegal nest" was not shown — `renderComposition` is **imported from the real
  module and its refusal behaviour was not exercised**, which is weaker than "the validator is provably
  in the path". Tracker: none; it is `build-checks` group 3's property, not this spike's.
- **A real-gesture cfg=c number on chromium and firefox.** Playwright's `mouse.move` round-trips per
  call and cannot deliver sub-frame move rates; the 4× throttle does not change it. Mechanism proven
  synthetically on all three. Moot — (a) passed, so (c) is not needed. In README *What was not done*.
- **cfg=b gesture numbers on firefox/webkit**, where its control did pass. (a) already passed on both
  and (b) is the branch with more code, so there was no branch to decide with them.

## Deviations from the plan

1. **(b)'s positive control uses `contentvisibilityautostatechange`, not the two observables the plan
   named** *(plan error)*. The plan specified `getBoundingClientRect().height` collapsing to
   `contain-intrinsic-size`, plus `checkVisibility({contentVisibilityAuto:true})`. Both proved
   unreliable **on a page where the cull is proven working**: a skipped element still returned
   `checkVisibility(...) === true` on all three engines, and the height read equals the natural height
   whenever the declared intrinsic size is near it. A control read through either would have reported
   "no cull" on a page that culls — the control's own failure mode, pointed the other way.
2. **(c)'s control runs in two move regimes, and a synthetic-burst mechanism probe was added**
   *(plan error)*. The plan assumed `cfg=a` redraws ≈ pointermove count and `cfg=c` ≈ frame count.
   At studio-journey's 40 × 15 ms gesture shape those are the **same number** — one move per frame,
   nothing to coalesce — so the control could never pass on that gesture. Both regimes are recorded
   and the finding is stated as "when the mitigation pays".
3. **Node count is `document.querySelectorAll("*")`, not `.sx-scroll *`** *(plan error, logged in
   AMENDMENTS before implementing)*. Lighthouse's DOM-size audit counts the whole document; with ~45
   nodes of planned headroom a scroller-scoped undercount is what would flip the finding. Both are
   printed.
4. **The drag movement assertion is scale-aware** *(plan error, logged in AMENDMENTS)*. The plan's
   `movedX !== startX` passes even when the handler forgets to divide the pointer delta by
   `--sx-scale`, which is exactly how a `?scale=0.5` row reads green on a half-weight gesture.
5. **`$SCRATCH` substituted** *(plan error, logged in AMENDMENTS)* — the plan named another session's
   scratchpad id.
6. **The zoom sweep is 3 × 36 steps, not 2 × 24.** The plan's shape never reached the 0.25 clamp; the
   run now asserts both clamps were visited (min ≤ 0.26, max ≥ 1.99).
7. **The harness `await document.fonts.ready` before measuring the frame box.** Read at append time it
   returns 316 px against a settled 251 px, which would have written a 65 px-too-tall
   `contain-intrinsic-size` into the one configuration whose point is that its numbers be real.
8. **Work happened in a worktree**, not the primary tree, which was on another ticket's branch
   (`feature/discovery-pre-grill-audit-292`, 3 commits ahead of a stale main).
9. **The verdict is split across T4/T5 and T2, rather than the plan's single branch-1 sentence.** The
   plan (and the pre-slice design) assumed one verdict line naming one branch. The rule's budget clause
   reads "zero dropped frames **during drag**", and T2's only gesture is the ⌘-wheel sweep — which has
   no drag and no INP row at all. A single "holds on all three engines → ship T2/T4/T5" sentence would
   have asserted T2 on the strength of drag rows that do not exercise it, and would have been retracted
   by this report's own Caveat 6 two sections later. **R6 was not invoked** — the engines did not split;
   the *properties* did.

## Assumptions carried

- **A1–A5 all honoured as written**: frames are arrays of 3–4 root nodes from the 20 committed
  `example` props; the arrow overlay sits inside the scaled stage with `non-scaling-stroke`; `--x`/`--y`
  are plain unit-carrying properties, not `@property`-registered; the five-step zoom table is not
  exercised; Playwright comes from the VR copy.
- **`VRDIR` is an absolute path into the main tree.** A fresh worktree has no
  `tooling/visual-regression/node_modules` (memory `local-agent-visual-gate-notes`), so the plan's
  hardcoded absolute path is correct here rather than something to relativise.
- **R6 was not needed, and the split that did happen is not the one R6 anticipated.** R6 pre-decided the
  *engine* split — a two-of-three result takes its worst engine's branch. The engines did **not** split
  on the rule's drag clause: (a) holds on all three. The split is across *properties* (T4/T5 clear, T2
  does not), which R6 does not govern and which no branch of the rule names, because the rule's clause
  is drag-scoped and T2 has no drag. Deviation 9 records how it was resolved. The engines **do** differ
  on (b) — reported as a finding, not a verdict branch, since (b) is not the branch taken.
- **Q1 resolved as the plan resolved it**: wheel and pan have no INP row by spec; `n/a by spec` is
  printed, never `0 ms`.
- **Q2 answered**: `scrollend` fires on all three engines (40/40, 40/40, 31/40), so (c)'s pan half is
  implementable everywhere.

## Additions beyond the plan

- **`raw/cfg-b-containment-probe.txt`** and its source — a 4-case placement × scale matrix on all three
  engines, isolating *which* property defeats `content-visibility: auto`. The plan asked only whether
  (b) engaged; "it didn't" is much less use to the swap PR than "T4 and T2 each defeat it independently
  on Chromium, and Firefox/WebKit are unaffected".
- **`raw/cfg-c-deferral-probe.txt`** and its source — the synthetic-burst coalescer check, so (c) could
  be reported as "the mechanism works, the gesture regime is what decides whether it pays" rather than
  as an unexplained failed control.
- **`--slow-arrows`, `--frames` and `--throttle` flags** on the driver, so the sampler's REDDENS
  mutation and Phase 1's cut-down shape are one flag rather than an edit.
- **A headed-browser eyeball pass with screenshots** (Level 4 in the plan, expanded to capture
  before/after arrow `d` and the zoomed stage).
- **`raw/zoom-cost-probe.txt`** and its source — added after a draft of the README asserted a mitigation
  ("defer arrow redraws during zoom") that turned out to be **factually wrong**: measured, there are
  **0 arrow redraws across 72 wheel events**, because the handler `preventDefault`s and only writes
  `--sx-scale`. The zoom cost is re-rasterising 30 scaled compositions, and configuration (c) cannot
  touch it. The claim was corrected before it shipped; the probe is what corrected it.

## Issues encountered

**A confounded probe nearly produced a false cross-engine finding, and the harness caught it.** The
first containment probe placed its absolute rows with `left:0` and **no `top`**, so all 40 stacked at
the same on-screen position; "NO CULL" was trivially true on every engine. It would have supported the
claim that `position: absolute` defeats `content-visibility: auto` on all three — **which is false**;
Firefox and WebKit cull fine. The harness's own (b) control disagreed with it (ff/wk passed there), and
that disagreement is what exposed it. The confounded probe is **not** in `raw/`; the corrected one is.
The general lesson is memory `check-that-cannot-fail` pointed the other way: a probe can fail to fail
for a reason that has nothing to do with the property under test.

Nothing else. No token spend, no agent run, no credential this machine lacks.
