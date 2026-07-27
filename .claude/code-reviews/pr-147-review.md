# Code review — PR #147 · /build joins the IA, and gets held to the gates (#138)

**Branch** `feature/build-links-gates-138` → `main` · 21 files · +1,716 / −20 · **state** OPEN, mergeable CLEAN
**Plan** `.claude/plans/build-links-in-and-gates.md` · **Report** `.claude/reports/build-links-in-and-gates-report.md`

**Recommendation: approve.** No critical or high issues. Both CI gates are green, the journey runs
green when I run it myself, all eight acceptance criteria are met, and every claim I spot-checked
against the code held up. Three findings (2 Medium, 1 Low) are worth a follow-up commit; none blocks
the merge, and none is a regression — all are hardening on code this PR introduces.

Reviewed twice: once directly, once by the `code-reviewer` agent in a clean context. The two passes
agreed on findings 1, 2, 5 and 6 independently; finding 3 came from the agent alone.

---

## Summary

The ticket's job was to make one sentence false ("the page is NOT linked from the IA yet") and then
prove the page survives being reachable. It does both, and the two defects it turned up on the way
are more valuable than the links.

The `hidden`-was-inert defect is a genuinely good catch with a real user cost: a visitor who emptied
their breadboard was shown "Nothing to keep from the build yet" above four live download buttons and
a share link, all still wired to the deleted build. The page-wide `[hidden] { display: none
!important }` is the right shape of fix — a `:not([hidden])` per rule has to be remembered by every
future edit, and this one cannot be forgotten — and it was verified in **both** directions, which is
the part most reviews would not have asked for.

The visual-gate truncation is the more consequential of the two. `toHaveScreenshot` without
`fullPage` captures the viewport, and the viewport was sized from a height measured before the
`activateOn:'visible'` beat rendered. The site footer had never been inside `index-*.png` since #105,
and nothing caught it because a baseline shorter than its page still compares cleanly against itself.
That is this repo's documented recurring defect class — the check that skipped the thing it tested —
and finding it in the gate itself is worth the ticket on its own.

---

## Issues

### Medium

**1. The re-measure loop can exhaust without converging, silently — and that re-opens the exact
failure it fixes.**
`tooling/visual-regression/visual.spec.mjs:150-155`

```js
for (let i = 0; i < 3; i += 1) {
  const settled = await measure();
  if (settled === h) break;
  h = settled;
  await page.setViewportSize({ width: 1280, height: h });
}
```

If three passes do not reach a fixpoint, the loop exits having just set the viewport to a height that
was measured at the *previous* viewport, and the capture proceeds anyway with no signal that
convergence failed.

*Failure scenario*: a future beat on `/build` or `index` grows the document on each resize (a
container-query or `dvh`-sized element that reflows when the viewport changes). Height goes
7508 → 7700 → 7850 → 7900, never settling. The screenshot is taken at 7850 against a 7900px document —
the last 50px are outside the frame. Because the capture run and the comparison run take the same
path, both truncate at the same place and the gate stays **green**. This is precisely the #105
symptom the loop exists to remove, and the comment three lines above ("three passes is far more than
any page here needs") is an assumption with nothing enforcing it.

*Minimal fix*: fail loudly on exhaustion rather than proceeding —

```js
let converged = false;
for (let i = 0; i < 3; i += 1) {
  const settled = await measure();
  if (settled === h) { converged = true; break; }
  h = settled;
  await page.setViewportSize({ width: 1280, height: h });
}
if (!converged) throw new Error(`${p.name}-${pack}: height never settled (last ${h}px) — the capture would truncate`);
```

**2. The console-error forgiveness filter is broader than its own comment claims — and the
justification it gives does not apply to any page this driver visits.**
`tooling/build-journey.mjs:502-507`

```js
const real = errors.filter((e) => !/ERR_CONNECTION_REFUSED|NetworkError|favicon|Load failed|8787/.test(e));
```

The comment above it attributes the exemption to the mock Worker being down and says "Nothing else is
forgiven." Two things are wrong with that. First, the justification is inherited from the
visual-regression convention for `factory`/`proto`/`instance` — pages this driver never opens.
`system/scenario-data.mjs` (the module that probes the Worker) is imported by nothing but itself, and
none of `build.html` / `index.html` / `work.html` load it, so the Worker refusal cannot currently be
exercised here at all. Second, `Load failed` is WebKit's generic message for *any* failed fetch and
`NetworkError` is Firefox's — so on those two engines the filter forgives every network failure on the
page, not just the Worker's.

*Failure scenario*: `/handoff/verdant/vocabulary.json` fails to load in WebKit. `pattern-render.mjs:99`
catches it into `vocabError`, renders the honest "could not be read" card, and — importantly —
`pattern-render.mjs:194` still sets `patternStage = "ready"`, so `settle()` succeeds. The console
error reads `Load failed` and is filtered out. Check `[18] console cleanliness` passes. The run still
goes red on `[2]`'s tile count, so nothing ships broken — but the driver reports "0 metric-tiles
rendered" and hides the one line that says why.

Nothing is masked *today*: every fetch on these three pages is caught in-app and never reaches the
console. This is a latent landmine, not a live defect.

*Minimal fix*: drop `NetworkError|Load failed` (neither is Worker-specific), keep
`ERR_CONNECTION_REFUSED|8787|favicon` as pre-emptive coverage, and reword the comment to say the
exemption is defensive rather than currently exercised.

### Low

**3. An engine that throws mid-journey reports "0 passed", discarding every assertion it had already
run — including the links-in checks this ticket exists for.**
`tooling/build-journey.mjs:516-522`

```js
} catch (err) {
  console.log(`\n  ✗ ${engine} threw before finishing: ${err.message}`);
  all.push({ engine, fails: 1, passes: 0, skips: [], threw: err.message });
}
```

`journey()` accumulates into a local `results` object that the outer `catch` cannot see, so a throw
replaces real counts with a hardcoded `{ fails: 1, passes: 0 }`.

*Failure scenario*: any `waitForSelector` / `waitForFunction` in steps `[1]`–`[16]` times out — say
the reduced-motion re-render at line 452 regresses. Chromium reports `✗ chromium threw before
finishing` with **0 passed**, even though ~70 assertions had genuinely passed, and steps `[17]`
(both links in, JS on and JS off) and `[18]` never run at all. The operator sees a total wipeout and
has to bisect by hand to find out that one edge case broke. This compounds finding 5: the vacuous
`true` means a re-render regression surfaces *only* through this path.

*Minimal fix*: catch inside `journey()` and return the accumulated object —
`results.fails += 1; results.threw = err.message; return results;` — instead of building a fresh stub
outside it. The existing summary loop already prints `r.threw`.

**4. `CLAUDE.md:80` says the journey has "76 assertions"; it reports 85.**
The doc commit (`93a7d38`) landed before the last test commit (`e3ae2b6`, which added the un-hide
direction), so the number was true when written and stale by the time the branch closed. Worth
calling out only because the same diff fixes this exact failure mode three lines above — the `dock.mjs`
line was deliberately rewritten to "state the mechanism rather than a count that goes stale again."
*Fix*: drop the count rather than correct it, and let `build-journey.mjs`'s own output be the number.

**5. `tooling/build-journey.mjs:453` asserts a literal `true`.**

```js
t("reduced-motion: an edit still re-renders the stage", true);
```

There *is* real signal — the `waitForFunction` on the line above throws if the stage never picks up
"Quiet motion" — but the failure surfaces as `✗ <engine> threw before finishing` with the pass count
wiped (finding 3), not as a named assertion. Every other check in the file passes a real condition,
and the file's own header says "a check that cannot fail is not a check." It also means the headline
figure is 84 real assertions plus one hardcoded pass, not 85.
*Fix*: `t("reduced-motion: an edit still re-renders the stage", (await rmPage.textContent("[data-pattern-stage]")).includes("Quiet motion"));`

**6. `build-import.mjs:50-52`'s "FOUR files now carry this number" is now five.**
`build-journey.mjs:56` hardcodes `MAX_EXPORT_MB = 32`. The hardcode itself is **forced and correct** —
`MAX_EXPORT_BYTES` at `build-import.mjs:53` is a module-local const with no export, so the journey
cannot import it the way it correctly imports `LABEL_MAX`, and citing the file and line is the honest
alternative. But the comment that tracks the carriers is now off by one, and it is the only thing
keeping the five copies in sync.
*Fix*: one word in `build-import.mjs:50`, or export the constant and drop the fifth copy.

---

## Verified negatives — recorded so they are not re-investigated

- **Home carries the same latent `hidden` defect and it has no symptom.** `index.html:192` is
  `<div class="brand-import-report" data-import-report hidden>` and `portfolio.css:1402` sets
  `.brand-import-report { display: grid }` — the identical shape of the bug this PR fixes on /build,
  and home gets no `[hidden]` rule. But both hide paths (`brand-import.mjs:246` and `:336`) clear
  `textContent` *before* setting `hidden`, and an empty grid whose only box property is `gap` has zero
  height. Nothing renders. The page-scoped fix is sufficient, and the documented reason for keeping it
  page-scoped (a site-wide rule churns all 20 baselines) stands.
- **The `!important` cannot fight an inline style.** No `element.style.display` write exists in any of
  the eight /build modules — consistent with `build-checks`' vetting group, which counts exactly one
  inline-style write across them. The only way to un-hide on this page is removing the attribute,
  which is what every module does.
- **The new close-card tier cannot displace `close.mjs`.** `close.mjs:108` resolves its mount with
  `querySelector("[data-close-extras]")`, not positional indexing, and the new tier is inserted before
  it. The tier reuses `.close-takeaway` / `-line` / `-row` verbatim, all of which already exist
  (`portfolio.css:1722-1755`) — no new CSS, so no new baseline surface beyond the height.
- **Every selector the journey drives resolves.** I checked all 24 distinct data-attributes and
  classes it queries against `build.html` + `system/*.mjs` + `system/*.css`; none is a typo that would
  make a check vacuous. `work.html`'s `#run` (line 171) exists for the `[17]` link assertion.
- **`.grid-3` exists and collapses.** `components.css:591` defines it and `:595` stacks it to `1fr` at
  the narrow breakpoint, so the third card degrades the same way the second always did.
- **The stagger reveal was already written for threes.** `components.css:688-689` keys off
  `:nth-child(3n+2)` / `:nth-child(3n+3)`, so adding a third card *completes* the intended cadence
  rather than breaking a two-card rhythm — the positional-CSS risk a `grid-2 → grid-3` change usually
  carries does not exist here.
- **Both `advanceTo` targets have a focusable heading.** `act-shape` and `act-breadboard` each carry a
  `.beat-title`, and `act-shape` also has a `.bx-q-prompt` that takes precedence — so neither branch of
  `build-questions.mjs:391-398` can no-op.
- **The baseline inventory matches the claim exactly**: 8 of 20 PNGs changed — `build` (new ×2),
  `index`, `work`, `approach`. The other 12 are byte-identical, which is the empirical half of the
  argument that the re-measure change is confined to the two `waitVisible` pages.
- **Playwright resolves as documented**: `createRequire` out of `tooling/visual-regression/` yields
  1.61.1, the version CI's `visual` job pins. It is not a repo dependency.
- **`build-checks.mjs:17`'s stale "29 hostile payloads"** (it is 32) is documented deviation 7 with a
  stated reason for leaving it, and filed as a follow-up. Not counted as a finding.
- **`AC7`'s "#133 pack-import modules" was the typo, not CLAUDE.md's "#130"** — the three modules'
  own headers say #130. The map is right.

---

## Validation

I ran the pure gates and the journey's chromium leg locally on macOS. I did **not** run the pixel gate
(needs the pinned Linux container) or the firefox/webkit legs, so those rows are CI's and the author's,
not mine, and are marked as such.

| gate | who ran it | result |
| --- | --- | --- |
| `node tooling/build-checks.mjs` | me | **7/7 groups ✓** |
| `node tooling/token-lint.mjs` | me | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | me | ✓ all 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | me | ✓ no drift, 3 groups |
| `node --check` × 5 changed JS files | me | ✓ |
| Playwright resolution out of `tooling/visual-regression` | me | ✓ 1.61.1 |
| `node tooling/build-journey.mjs chromium` | me | **85 passed · 0 failed · 0 skipped** |
| CI `verify` job (now incl. build-checks) | GitHub | ✓ pass, 16s |
| CI `visual` job — 20 PNGs, pinned container | GitHub | ✓ pass, 49s |
| `node tooling/build-journey.mjs all` | author | 85/85 × 3 engines × 3 runs, 0 flakes, 0 skips |
| Keyboard-only walk, 66 stops | author | no trap, no lost focus, every verb announces |

I re-ran the journey myself rather than reading its assertions, which is the only way to know a driver
of this kind is real. It went green end to end, including `[17]`'s clicked links with JS on and JS off
and `[12b]`'s un-hide direction. Note that `serve.mjs` serves the working tree, which here carries a
parallel session's unstaged copy edits to `index.html` — they did not affect any assertion, but the
run is not a clean-tree run.

`mergeStateStatus: CLEAN`. The PR body carries `Closes #138`, which is the trailer this repo's rules
require and which #78 cost a planning pass for missing.

**Acceptance criteria**: AC1–AC8 all met. AC8's "review committed in the PR" is this file.

---

## What's good

- **The gate defect was found by tightening a check, not by luck.** The report is explicit that both
  of the first two new assertions were wrong before they were right, and that the over-claiming one is
  what surfaced the real `hidden` bug. That is the honest version of how this actually goes.
- **The `!important` was checked in the direction it could break.** "Nothing hidden renders" is half a
  proof; a page-wide `!important` outranks every author rule including shared chrome nobody audited.
  Asserting that a real committed token export's mapping report and download row *do* appear, and that
  the dock paints all four pack rows while its own hidden row stays hidden, is the other half. Most
  reviews would have accepted the first half.
- **The empty-board check has a control.** `build-journey.mjs:398` asserts the keep-rail controls
  *are* there before asserting they are gone, so a typo'd selector cannot pass the check. Given this
  repo's documented history of green-and-useless gates, that is the right instinct applied in the
  right place.
- **Constants are imported, not retyped.** `LABEL_MAX` and `QUADRANT_MEANINGS.dealer` are read from
  the shipped modules, so a reworded matrix or a moved cap fails the journey instead of drifting past
  it. (Finding 5 is the one place this could not be done, and the file says why.)
- **The engine difference is asserted, not skipped.** Clipboard permissions differ across the three
  engines; rather than skipping, the journey asserts that whichever branch ran, the visitor was told
  something true and the link is on screen. Zero skips logged.
- **`serve.mjs`'s extensionless resolution** sits *after* the existing `target.startsWith(base + sep)`
  traversal guard and only appends a literal `.html` to an already-validated path, so it cannot escape
  the base directory. Making the local server match how Cloudflare Pages actually serves the site is
  what makes `[17]`'s "the link resolves" assertion falsifiable at all.
- **The loc-summary call was decided from the measured number** (17,029 → 17,058, eight lines past the
  boundary) and both approach PNGs were deleted before the run because `maxDiffPixels: 100` would have
  swallowed a few changed digits. That is the trap in this repo's own memory, avoided deliberately.
- **The staging discipline.** With five unrelated in-progress files from a parallel session in the
  working tree, `index.html` was staged as a synthesized blob rather than `git add`, and the staged
  diff was read back. All five are still unstaged.
- **The negative results are written down** — the file input *is* visibly focused, the radiogroup Tab
  behaviour is correct not a defect, the "nameless" footer link was the walk script's bug. Those are
  the findings that otherwise get re-investigated every ticket.

---

## Recommendation

**Approve.** Findings 1, 2 and 3 are worth a short follow-up commit — finding 1 especially, since a
silently non-converging capture is the same class of defect the loop was written to kill, and this
ticket's own thesis is that a check which skips the thing it tests is not a check. Findings 4, 5 and 6
are one-line corrections. None of the six changes behaviour a visitor sees, none blocks the merge, CI
is green on both jobs, and the journey is green when run independently.

*Reviewed with fresh eyes per `piv-review-pr`; deep pass dispatched to the `code-reviewer` agent.
Posted as a comment rather than a formal approval — GitHub does not allow self-approval on this repo.*

---

## Resolution — all six fixed on this PR

Triaged as one set: every finding is on code this PR introduces, none is larger than a few lines, and
the PR was still open. Fixed in `ccaf6e7`. Each was proven by **mutating the source and running it**,
never by reading the diff — this ticket's own thesis, and the repo's documented recurring defect.

| # | fix | the mutation that proved it |
| --- | --- | --- |
| 1 | throws on exhaustion; bound 3 → 6; both heights named | `PASSES` forced to 1 → `index · neutral` goes **red** with the new error instead of capturing |
| 2 | `NetworkError\|Load failed` dropped; comment relabelled defensive | the two engine-generic messages go from forgiven to reported; the journey's `[18]` still green on firefox **and** webkit |
| 3 | `results` owned by the caller, browser parked in `held` | injected mid-run throw → `76 passed · 1 failed · threw` (was `0 passed`), no leaked browser |
| 4 | count dropped from `CLAUDE.md:80` | n/a — the driver's own output is the number now |
| 5 | timeout caught **into** the condition | broken re-render label → named `✗`, and the run continues through `[17]`/`[18]` (was: engine throws, both steps never run) |
| 6 | `MAX_EXPORT_BYTES` exported and imported | `[15]` still asserts the refusal's wording against the shipped cap |

Two departures from the review's suggested fixes:

- **Finding 1 got a bigger bound, a measured margin, and a re-worded diagnostic.** The fix converts an
  unmeasured assumption into a **blocking** gate, so the assumption had to be measured: in the pinned
  container both `waitVisible` pages reach their fixpoint on the *second* measurement (`index`
  7569 → 8136, `build` 7251 → 7508 under neutral), leaving four spare passes at a bound of 6. The
  first draft of the error message was itself wrong — the forced-failure run printed
  `viewport 8136px vs document 8136px ... would truncate the difference`, because the final re-measure
  happens *after* the last resize. It now reports both numbers and claims nothing about their
  direction, since "one pass short" and "still growing" are different bugs with different fixes.
- **Finding 5's literal suggested fix is still tautological** — the `waitForFunction` above it
  guarantees the text before the assertion reads it, so `.textContent(...).includes(...)` can only
  fail on a race. Catching the timeout into the condition is what makes it an assertion, and is what
  makes finding 3's fix visible rather than theoretical.
- **Finding 6 took the export route, so the comment needed no edit** — four files still carry the
  literal, which is what `build-import.mjs:50` already says.

**Re-validated after the fixes**: `build-checks` 7/7 · `token-lint` ✓ · `drift-check` ✓ all 8 ·
`gen-loc-summary --check` ✓ no drift · `build-journey all` **85/85 × 3 engines** ·
pixel gate in the pinned Linux container **20/20**, run from a clean detached worktree so the parallel
session's unstaged edits could not reach it. No baseline changed — the loop already converged, so no
captured pixel moved.
