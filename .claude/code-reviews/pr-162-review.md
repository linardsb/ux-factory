# Review — PR #162 · `feat(analytics): /build/pattern + /build/shared` (Closes #149)

**Branch** `feature/build-analytics-149` → `main` · 11 files, +1465/−6
**Recommendation: request changes** — one blocking issue, three Lows.

---

## Summary

The ticket does what it claims: two virtual-route pageviews, each fired once from the one code path
that means it, each path a static module-level literal. The scope decisions (two events, not five)
are recorded, the deviations are documented, and both gates were proven falsifiable by mutation
rather than just run green. The `typeof document` fix is a genuine latent-CI-break catch that this
ticket is the first to be able to see.

One defect blocks: **the new pattern flip can collide with `build-keep`'s 400 ms URL debounce and
leave the visitor holding a share link that 404s.** The PR already found and fixed this exact hazard
on the sibling copy path (`clearTimeout(urlTimer)`, build-keep.mjs:267) — the pattern path has the
same hazard and no guard, because `trackBuildPattern()` fires from `pattern-render.mjs`, which has no
access to `urlTimer`.

---

## High

### 1 · The pattern flip and the 400 ms URL debounce race — the share-link field ends up holding a dead link

**`system/analytics.mjs:148-169` (`flipTo`) × `system/build-keep.mjs:313-320` (`urlTimer`)**

`flipTo` blanks `location.search` for `RESTORE_DELAY_MS` (50 ms). Inside that window,
`build-keep`'s debounced URL write calls `currentUrl()` (build-keep.mjs:234-236), which reads
`location.href` — the virtual path — and `shareUrl()` (build-share.mjs:367-371) does
`new URL(base)` and only overwrites `?b=`. The pathname survives into the link.

**Reproduced**, using the real `flipTo`, the real `shareUrl` and the real `encodeBuild`, sweeping
where in the 400 ms debounce cycle the flip opens:

| flip opens at | address bar ends at | link field ends at |
| --- | --- | --- |
| t = 355–375 ms | **`/build/pattern?b=…`** — left there | `/build/pattern?b=…` |
| t = 385–395 ms | `/build.html?b=…` (one edit behind) | **`/build/pattern?b=…`** |
| t = 400 ms+ | `/build.html?b=…` | `/build.html?b=…` (clean) |

Two distinct failure modes, split by whether the debounce's `await encodeBuild(...)` resolves before
or after the restore. In the earlier sub-window the late write lands *after* the flip's one-shot
restore and overwrites the correction, so the visitor is **left** on `/build/pattern?b=…`. In the
later sub-window the address bar recovers but the field — the input labelled *"The link that
rebuilds this build"* — keeps the broken URL.

There is no `_redirects` in the repo and `_headers` sets response headers only, so Cloudflare Pages
404s on `/build/pattern`. A reader who copies from the field, bookmarks, or forwards at that moment
sends a dead link — which is precisely what the feature exists to make reliable.

**Reachability — narrow but real, and not exotic.** It needs all three:
1. `linkLive === true`. `restore()` sets this at **build-keep.mjs:338, before** `restoreBuild(state)`
   publishes `BUILD_CHANGE`, so it is true from boot for *every* visitor arriving on a `?b=` share
   link — the population this feature is for.
2. A `BUILD_CHANGE` arming the debounce — every keystroke in the Act 3 breadboard does this.
3. The IntersectionObserver-gated `vocabulary.json` fetch (pattern-render.mjs:120-132) resolving
   350–400 ms after the last keystroke, since that fetch is what triggers the first successful
   `renderPattern()` and therefore the fire-once flip.

The plausible sequence: a reader opens a shared build, scrolls into Act 3 (which brings Act 4 inside
the 800 px `rootMargin`, starting the fetch), and renames a place. If they pause typing for ~350-400
ms while the fetch is in flight, the two clocks collide. It needs a typing pause of about the right
length — it is not routine — but it is an ordinary interaction, not a sub-100 ms reflex like the
orderings build-checks.mjs deliberately excludes as "an ordering no page produces".

**Neither new gate can see this.** Group 10 drives `flipTo` with nothing else running; [17b] never
has a debounce armed across a flip. This is the repo's own documented failure shape — *the check that
cannot fail*: every #137 defect survived a green gate because the check skipped the thing it tested.

**Fix — the discriminating question is: does the share link need anything from `location` besides
the pathname?**
- **If no** (most likely — `shareUrl` overwrites `?b=` and nothing reads the hash): let `build-keep`
  own a stable base URL it updates only from its own `replaceUrl`, instead of re-deriving from
  `location.href` on every debounce tick. Three lines, no new export, no cross-module coupling, and
  immune to any future transient rewrite of `location`.
- **If yes** (some other query param or the dock's `#appearance` must survive into the link): you
  need a flip-in-flight predicate exported from `analytics.mjs`, with the debounce callback re-arming
  itself while one is open — the cross-module version of the `clearTimeout` already at line 267.

**Please add the regression gate with the fix** — build-checks group 10 case D: arm a 400 ms timer,
fire `trackBuildPattern()` at t ≈ 370, assert the resulting link's pathname is `/build.html`. Without
it the fix is asserted rather than falsifiable, and the next regression is invisible again. A working
repro is in this review's session scratchpad and transcribes directly.

---

## Low

### 2 · The fire-once flag latches before `pushState` is known to have succeeded

`analytics.mjs:180-182` and `194-196` set `buildPatternFired` / `buildSharedFired` **before** calling
`flipTo`, which returns silently if `history.pushState` throws (lines 150-154). "Fired" therefore
means "attempted once", not "recorded", with no retry path.

Low, not Medium: in any context where `pushState` throws (`file://`, sandboxed), no analytics is
possible at all, so nothing is actually lost. Worth noting only because group 10 never drives that
catch branch — none of stubs A/B/C makes `pushState` throw — so "latched fired, nothing recorded" is
invisible to the committed gate. If you touch it, moving the assignment inside `flipTo` after a
successful push (or having `flipTo` return a boolean) is a one-line change per call site.

### 3 · [17b]'s pre-scroll IFF only ever exercises its negative branch

`tooling/build-journey.mjs:734-737`. At the driver's fixed 1440×900 viewport Act 4 is always outside
the 800 px `rootMargin`, so `preRendered` is always `false` and only the negative half of the IFF
runs. The IFF framing is still the right call — it is what stops the check passing when the stage
breaks for an unrelated reason — but the name implies bidirectional proof the run never delivers. A
comment saying so is enough.

### 4 · `(location.hash || hash)` relies on a dock invariant that is currently coincidental

`analytics.mjs:166`. The fallback cannot distinguish "no hash written during the window" from "a hash
deliberately *cleared* during the window". It is correct today only because all three of dock.mjs's
close paths — Escape (`:455`), click-outside (`:458`) and toggle (`:450`) — gate on
`location.hash === "#appearance"`, which is false for the entire flip window, so none of them can
clear the hash mid-window. Any future code that clears `location.hash` unconditionally would be
silently undone. One line of comment naming the invariant the fallback leans on.

---

## Checked, not findings

- **The `[9]` sibling collision** the report cites — `restore()`'s bad-`?b=` scrub `replaceUrl`
  (build-keep.mjs:334) — is unreachable in a flip window: it runs at boot, awaited before
  `data-build-keep='ready'`, whereas the pattern flip needs the IO-gated vocab fetch, which needs a
  scroll. No action.
- **Both call sites match their comments.** `trackBuildPattern()` is genuinely the last statement of
  `renderPattern()`, after the `renderComposition` that can throw (pattern-render.mjs:189, 204), so a
  composition that never reached the DOM cannot be counted. `trackBuildShared()` is genuinely outside
  the try/finally and gated on `built` (build-keep.mjs:248, 262-272), and fires on both the clipboard
  and select-the-field outcomes.
- **The privacy promise holds.** Both paths are module-level literals, nothing interpolates, and
  group 10 asserts them against a `location.search` carrying a real `?b=` payload.
- **The 7 documented deviations** are all intentional decisions, several of them corrections to the
  plan's own instructions. Not treated as issues. Deviation 1 (the live-hash restore) is well
  evidenced — a gate failure at 1-in-9, then deterministic cross-engine reproduction.

---

## Validation

| Gate | Result |
| --- | --- |
| `node tooling/build-checks.mjs` | ✓ all 10 groups pass |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ 3 groups — no drift |
| CI `verify` | ✓ pass |
| CI `visual` | ✓ pass |
| `tooling/build-journey.mjs` | not re-run (operator-run, 3 engines); PR reports 121/0 across 9 engine-runs |

Nothing red. The blocking finding is a gap in what the gates *cover*, not a gate failure.

---

## What's good

- **Group 10 mutates before it concludes.** Patching `BEACON_TOKEN`/`PRODUCTION_HOST` to non-empty
  and importing *that* is what makes the launch-day break visible today, and the assertion that the
  mutation actually landed (`build-checks.mjs:1090-1092`) closes the "testing nothing" hole. The
  `?g10a/b/c` fresh-instance trick is the right answer to fire-once state contaminating cases.
- **The `typeof document` guard**, and guarding on `document` rather than `location` — the injected
  branch touches `document.createElement`, so a `location`-only guard would still throw once
  `PRODUCTION_HOST` is filled. That reasoning is correct and non-obvious.
- **Firing from `renderPattern`'s last line, not `data-pattern-stage="ready"`** — four non-rendering
  branches set that flag. Exactly the `peak.mjs:240` lesson, applied without being told.
- **[17b]'s IFF framing and its in-page 1 ms poll.** Moving the 50 ms race entirely inside
  `page.evaluate` is the only way that collision is drivable, and it is correctly reasoned.
- **Deviation 1 escalated on measured evidence** against a recorded plan decision, with both halves of
  the restore expression pinned by their own falsification. That is the right way to overturn a plan.
- **The CLAUDE.md line scopes its claim** to the `/build` pair and says plainly that the four
  `/factory` trackers were not touched, rather than implying a guarantee that does not hold.

---

## Recommendation

**Request changes** — fix finding 1 and land its regression gate. Findings 2–4 are optional polish
and should not gate the merge.
