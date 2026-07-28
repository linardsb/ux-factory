# Implementation Report — /build's two virtual-route pageviews (`/build/pattern`, `/build/shared`)

**Plan**: `.claude/plans/build-analytics-virtual-routes.md`
**Branch**: `feature/build-analytics-149`
**Closes**: #149 (epic #134)
**Status**: COMPLETE

## Summary

`system/analytics.mjs` gains two virtual-route pageviews for the builder — `/build/pattern` when a
pattern is actually on stage, `/build/shared` when the visitor has a share link in hand — each fired
once from the one code path that means it, and each a bare static literal because the path is the
entire payload. It also closes a latent CI break the ticket was the first to touch: the module read
`location.hostname` at module scope and survived Node only because `BEACON_TOKEN` was `""`, so
filling the token at launch would have taken CI's `verify` job down.

One thing changed against the plan, and it is the finding of this ticket rather than a detail: the
50 ms restore now takes the hash **live**. The plan predicted the flip/dock collision and recorded it
as accepted ("not worth a mechanism; worth a sentence"). It is worth a mechanism — see Deviations.

## Tasks completed

| Task | File | |
| --- | --- | --- |
| 1 · node-safety boot guard + the why | `system/analytics.mjs` | UPDATE |
| 2 · `flipTo()` + `trackBuildPattern` + `trackBuildShared` | `system/analytics.mjs` | UPDATE |
| 3 · fire from `renderPattern`'s success path | `system/pattern-render.mjs` | UPDATE |
| 4 · fire after the link exists + `clearTimeout(urlTimer)` | `system/build-keep.mjs` | UPDATE |
| 5 · group 10, the PREDICATE (+ header 9→10, verdict 9→10) | `tooling/build-checks.mjs` | UPDATE |
| 6 · check [17b], the WIRING | `tooling/build-journey.mjs` | UPDATE |
| 7 · the architecture-map line | `CLAUDE.md` | UPDATE (1 line) |
| 8 · the loc-summary cascade + baselines | `system/loc-summary.json`, 2 PNGs | REGENERATED |

`350 insertions, 6 deletions` across 9 files. No new dependency; shipped pages stay vanilla.

## Tests added

There is no unit suite in this repo (CLAUDE.md). The two committed gates are the tests, split the way
#157 drew the line: **the predicate in CI, the wiring only ever against a running page.**

### `tooling/build-checks.mjs` group 10 — PREDICATE (runs in CI's `verify`)

Pure Node. Three scenarios over a `location`/`history` stub that **moves when history does** — a
recording-only stub would have made every hash assertion vacuous, since the window it tests exists
precisely because `pushState` replaces the pathname, query and hash.

- **A** — the ordinary contract: both events, called twice each, on a URL carrying a real `?b=`
  payload. Exactly two pushes; each the exact literal; each matching `/^\/build\/[a-z]+$/`; neither
  containing the payload; both restores verbatim.
- **B** — the reader who *arrived* with `#appearance` and touched nothing → the snapshot hash comes
  back.
- **C** — the collision: `#appearance` written *inside* the window → it survives the restore.

Plus the launch guard: the module is imported with **both** `BEACON_TOKEN` and `PRODUCTION_HOST`
filled, while `globalThis.location` is still undefined. Order is load-bearing and commented as such.

### `tooling/build-journey.mjs` check [17b] — WIRING (operator-run, three engines)

10 assertions: a `history.pushState` recorder installed via `addInitScript` that **calls through**;
zero `/build/pattern` before a pattern renders; exactly one after; still one after a board edit;
exactly one `/build/shared` on copy, on whichever clipboard outcome the engine gives; every pushed
route a bare static path; the address bar restored with `?b=` intact; and the dock collision driven
from inside the page on a second page of its own.

## Validation results

| Gate | Result |
| --- | --- |
| `node --check` × 5 changed JS files | ✓ |
| `node tooling/build-checks.mjs` | ✓ **all 10 groups pass** |
| …with `portal/node_modules` moved aside (SDK-free invariant) | ✓ all 10 groups pass |
| `node tooling/build-journey.mjs all` — **post-fix** code (121 assertions) | ✓ **121 passed · 0 failed** on chromium, firefox, webkit |
| …repeated ×3 (9 post-fix engine-runs) | ✓ **0 failures across all 9** |
| (for contrast: **pre-fix** code, 118 assertions, 3 × 3 engine-runs) | 1 failure — firefox, run 3, check [7]. That run is what found the dock collision. |
| `node agent-layer/gen-loc-summary.mjs --check` (after staging) | ✓ no drift |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| Visual gate (`update:docker`) | 20/20; only the 2 approach baselines rewritten |

**Both gates were proven falsifiable, not just run green** (memory: `check-that-cannot-fail`):

| Mutation | Named failure |
| --- | --- |
| drop the `typeof document` guard | group 10: "analytics.mjs throws under Node once the token is filled (location is not defined)…" |
| `flipTo(BUILD_PATTERN_PATH + location.search)` | group 10, ×3: not the literal · not a bare static path · carries the visitor's `?b=` build |
| share one fire-once flag between the two events | group 10, ×3: "1 virtual routes pushed, expected exactly 2…" |
| restore the snapshot hash (`+ hash`) | group 10 C: "a hash written inside the flip window was dropped…"; **[17b] on the real page**: `hash:""`, `showing:4` |
| take the hash live with no fallback (`+ location.hash`) | group 10 B: "a hash the reader arrived with was not restored…" |

The last two mutations pin the expression from **both** sides, which is what makes it a check rather
than a restatement of the code.

### Regression surface — observed, not assumed

Quoted from the three post-fix `all` runs — the plan asks for [9] three times, and it ran nine:

```
9   ✓ the dock is genuinely shut before it is opened (0 of 4 pack rows showing)   [7]
9   ✓ the bad param is scrubbed from the URL                                      [9]
9   ✓ the link is in the address bar                                              [6]
9   ✓ reduced-motion: the share link still round-trips the whole build           [16]
6   ✓ it fired on the outcome this engine actually gave (clipboard granted)      [17b]
3   ✓ it fired on the outcome this engine actually gave (clipboard refused → field fallback)
```

That last split is worth keeping: the engines genuinely disagreed about clipboard permission across
runs, and `/build/shared` fired on **both** branches — which is the plan's AC4 edge case observed
rather than argued.

### The loc-summary cascade — the expected branch happened

Runtime group measured at raw **17,400** on this branch before any edit (50 lines of headroom, not
the plan's 53 — PR #161 had since added 3 lines to `system/client.neutral.config.js`). The change
crossed it: **17,400 → 17,500**, total 24,500 → 24,600.

Both approach baselines were `rm`'d before `update:docker` (memory: `vr-update-skips-subperceptual`
— a three-digit diff is otherwise skipped), and the re-capture was confirmed to actually carry the
new number rather than trusted from a green run (memory: `vr-tolerance-hides-text-changes`):
approach.html renders *"56 files, about 17,500 lines"*. The other 18 baselines passed unchanged — no
`/build`, home or work churn, as predicted.

## Deviations from the plan

**1 · `flipTo()` restores the hash LIVE. This is a shipped-behaviour change the plan explicitly
declined, and it is the ticket's real finding.**

The plan's NOTES ("The one dock window that stays open") predicted that `pushState` blanks
`location.hash` for 50 ms, so a dock toggle inside that window is clobbered by the restore — leaving
the panel open with no `#appearance` for `dock.mjs:455`'s Escape handler to match. It judged this
"not worth a mechanism; worth a sentence."

The evidence says otherwise:

- **It broke a committed gate.** On the third `all` run, firefox failed check [7] — *"the dock is
  genuinely shut before it is opened"* — 1 in 9 engine-runs. `page2` renders its pattern in
  `settle()`, and [6]'s ~10 following round-trips sometimes finish inside 50 ms.
- **It reproduces deterministically on all three engines.** A probe that sets the hash the instant
  the flip is recorded: hash at Escape `""` and 4 pack rows still showing, versus `"#appearance"` and
  0 rows when set 150 ms later. Chromium, firefox and webkit alike.
- **The consequence is a keyboard trap on a shipped page**: the dock is open, Escape does nothing,
  and the only way out is toggling again.

The fix is one expression — `pathname + search + (location.hash || hash)` — and each half is pinned
by its own falsification (table above). Path and query stay from the snapshot: the virtual path
carries neither, so reading them live would restore `/build/pattern` and drop the visitor's whole
`?b=` build. The plan pre-authorized exactly this move for the sibling collision at [9] ("the fix is
to move the scrub's `replaceUrl` after the restore delay, not to reorder the tracker"), so this is
the plan's own escalation path, taken on evidence it did not have.

**2 · The helper is named `flipTo`, not `flip`.** `trackFactoryArrived` already has a local
`const flip` (`analytics.mjs:110`). A module-level `flip` shadowed by a zero-arg local of the same
name is a legibility trap, and deleting the local later would silently call `flip(undefined)` and
push `"undefined"` as a path. `trackFactoryArrived` is untouched, per Non-Goals.

**3 · Group 10's imports are cache-busted (`?g10a/b/c`).** The plan's step 4 said the import gives a
"fresh instance, guards unconsumed (nothing else in this file imports it)". That is false once Task 4
lands: `build-checks.mjs:46,51` imports `build-keep.mjs` and `pattern-render.mjs`, which now import
`analytics.mjs`, so it is registry-cached before group 10 runs. It still worked, but the stated
reason didn't — and three scenarios need three instances anyway, since fire-once gives one push per
event per instance.

**4 · Check [17b]'s negative is written as an IFF.** `!flips.includes("/build/pattern")` alone passes
for every reason a pattern fails to render — a broken vocabulary fetch, a JS error, a future layout
change putting Act 4 in view at load. It now asserts that the observed render state and the observed
flip **agree**, and prints which case the engine gave (`pattern on stage before scrolling: no`).

**5 · `built` is a boolean, not the URL string.** The plan sketched `let built = null; … built = url`.
Nothing downstream uses the URL, so it holds a boolean.

**6 · The plan's Level 5 manual browser pass was not run by hand, deliberately.** All six of its
steps — no flip before Act 4, one flip on render, no second flip on re-render, one `/build/shared` on
copy, the address bar settling back on `?b=`, and `#appearance` opening and closing without eating
the query — are each driven as an assertion in [17b] or [7] across chromium, firefox and webkit, and
[18] asserts zero console errors on all three. That is strictly stronger than one hand pass in one
browser, so the checklist item is met by the driven gate rather than duplicated by hand.

**7 · Task 5's falsifiability command was not run as written.** The plan's
`git checkout system/analytics.mjs` restores from the **index**, which at that point still held HEAD
— it would have silently reverted Phases 1–2. A scratchpad `cp` was used instead.

## Issues encountered

**The Bash working directory persisted across calls** after an early `cd tooling/visual-regression`,
so a later `rm tooling/visual-regression/baselines/approach-*.png` resolved against the wrong root and
failed harmlessly. Nothing was lost — the paths didn't exist to delete — and the removal was redone
from an absolute path. Worth flagging because the same slip against a path that *did* exist would
have deleted the wrong file.

**The first dock probe measured visibility wrong.** `getComputedStyle(e).display !== "none"` on
`.dock-pack-row` reported 4 rows showing in *both* directions, because the dock hides via an ancestor
— the check silently stopped meaning anything. Re-measured by bounding box, the way Playwright's
`:visible` does. The committed [17b] version carries a comment saying so, since it is exactly the
`check-that-cannot-fail` shape.

## Ready for the next step

All tasks complete, all validation green, both gates proven falsifiable. Next: `piv-commit`, then
`piv-create-pr` (the PR body **must** carry `Closes #149`), then `piv-review-pr`.

**For the reviewer:** deviation 1 is the one to read first — it changes shipped behaviour against a
recorded plan decision, on evidence gathered during implementation. Deviations 3, 4 and 6 are
corrections to the plan's own instructions, not departures from its intent.

**For the first dashboard glance after launch:** `/build` pageviews ÷ `/build/pattern` is a
*completion* ratio, not a conversion rate — a reader who opens the page and scrolls to Act 4 without
answering anything still renders the default dashboard and counts. `/build/shared` is link
*production*, not forwarding. The receiving half stays deliberately unmeasured (plan Non-Goals).
