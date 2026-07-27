# Implementation Report — /build joins the IA, and gets held to the gates

**Plan**: `.claude/plans/build-links-in-and-gates.md`   **Branch**: `feature/build-links-gates-138`   **Status**: COMPLETE

## Summary

/build has shipped complete since #137 and nothing linked to it. It is now reachable from the home
close card and from work.html's "Run it" grid — as static markup, so both links survive JavaScript
being off — and it is held to the same gates as every other shipped page: screenshotted under both
packs, counted by loc-summary, driven end to end across three browser engines, walked keyboard-only,
and written into CLAUDE.md's architecture map.

Two defects were repaired along the way, and neither was in the plan's list. The visual gate had been
silently truncating its captures since #105: the site footer had **never** been inside
`index-{neutral,saulera}.png`. And on /build itself, `hidden` was doing nothing to two of the keep
rail's three tiers, so a visitor who emptied their board was offered four live downloads and a share
link for the build they had just deleted. The second was found by the new journey, not by eye.

## Tasks completed

| task | files |
| --- | --- |
| Link in from the home close beat | `index.html` (UPDATE) |
| Link in as work.html's third exhibit, grid-2 → grid-3, heading + lead re-counted | `work.html` (UPDATE) |
| Head comment no longer claims the page is unlinked | `build.html` (UPDATE) |
| #144 finding 7 — removing a place announces the connections that went with it | `system/breadboard.mjs` (UPDATE) |
| #144 finding 8 — act advance moves focus, not just scroll | `system/build-questions.mjs` (UPDATE) |
| loc-summary regenerated from the staged index | `system/loc-summary.json` (UPDATE) |
| /build in the visual gate + the bounded re-measure fix + two stale comments | `tooling/visual-regression/visual.spec.mjs` (UPDATE) |
| Extensionless → .html, as Cloudflare Pages serves the site | `tooling/visual-regression/serve.mjs` (UPDATE) |
| Gate coverage comment + a stale payload count | `.github/workflows/verify.yml` (UPDATE) |
| Ten baselines / twenty PNGs | `tooling/visual-regression/baselines/*.png` (8 changed, 2 of them new) |
| `hidden` defeated by author `display` — page-wide fix | `build.html` (UPDATE) |
| The cross-engine journey driver | `tooling/build-journey.mjs` (CREATE) |
| build.html, eight /build modules, three #130 import modules, both gates, one "where new code goes" line | `CLAUDE.md` (UPDATE) |

Six commits: `0b33468` links + a11y + loc-summary · `a3b8140` the gate change · `ec8a876` the
baselines · `bbe08e6` the `hidden` fix + the journey · `694f66c` the /build re-capture · `93a7d38`
the map.

## Tests added

**`tooling/build-journey.mjs`** — 85 assertions, committed and re-runnable, seeded from #137's
deleted scratch script (43 assertions, Chromium-only) and rewritten to run on all three engines.
Playwright is resolved out of `tooling/visual-regression/node_modules` at 1.61.1 — the version CI's
`visual` job pins — so the driver and the pixel gate always mean the same browser build. It is
deliberately not in CI (owner's call): three engine downloads per PR buys less than it costs.

Kept from #137: the settled handles, the default build, both wizard-driven shape changes, the
out-of-library refusal, board edit → stage re-render, the share round-trip in a fresh context, the
dock/query-string interaction, four downloads with their content assertions, the tampered-link
refusal, SVG escaping under a hostile label, and restore order-independence.

Added for #138 — the eight edge cases the ticket named, plus one invariant the first of them exposed:

| edge | what it asserts |
| --- | --- |
| skip-import | derive-a-palette re-skins both stages with no file at all, and "Clear the stage" undresses both |
| accept-all-defaults | load → rendered pattern, measured, asserted ≤ 60s (runs at ~2s) |
| "dealer" verdict | the panel quotes `QUADRANT_MEANINGS.dealer` **verbatim** and does not soften it |
| emptied breadboard | no pattern, the rule's own words on the stage, keep rail shows its empty state and offers nothing — with a **control** asserting the controls ARE there beforehand |
| 33 MB refusal | a runtime-generated 33 MB file, refused client-side, message checked against the real 32 MB constant; fixture deleted, never committed |
| reduced-motion | `reducedMotion: 'reduce'` — pattern renders, edits re-render, the share link still round-trips |
| dock mid-flow | `?b=` **and** the whole build state survive opening/closing `#appearance`; `?brand=` on home too |
| the links in | both links **clicked**, landing on the real builder, with JS on and with JS off |
| `[hidden]` invariant | every element carrying `hidden` is checked for `display: none`, in **three** page states |
| the un-hide direction | a real committed token export imports, and the mapping report + tokens download row that `hidden` was hiding actually **appear**; the appearance dock is shut before opening and paints every pack row after |

**Engine differences are asserted, never skipped.** Clipboard-write is permissioned and the three
engines answer differently; `build-keep.mjs:231-238` promises exactly two outcomes and puts the URL
in the address bar *before* it tries the clipboard. The journey asserts that whichever branch ran,
the visitor was told something true and the link is on screen to take. Zero skips were logged on any
engine.

## Validation results

| gate | result |
| --- | --- |
| `node --check` × 4 (breadboard, build-questions, visual.spec, build-journey) | pass |
| `node tooling/build-checks.mjs` | **7/7 groups ✓** |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| `node tooling/drift-check.mjs` | ✓ all 8 checks |
| `node agent-layer/gen-loc-summary.mjs --check` | ✓ no drift |
| visual gate, pinned container (`v1.61.1-jammy`) | **20/20**, twice — capture run then comparison run |
| `node tooling/build-journey.mjs all` | **85/85 × chromium + firefox + webkit × 3 consecutive runs = 9/9 green, 0 flakes** |
| links, JS on and JS off | both land on `/build`, title `The builder · your design · Linards Berzins` |
| work.html layout | 1 row at 1280px, stacked at 640 and 380, no horizontal overflow at any width |

### The loc-summary coin flip — decided from the number, not assumed

Measured, not guessed: the runtime group went **17,029 → 17,058** unrounded, **eight lines** past the
17,050 boundary. So the rendered figure moves 17,000 → 17,100, approach.html renders it, and the two
approach baselines were **in scope**. Because the only visual delta is a few digits — height
identical, 5471px before and after — `maxDiffPixels: 100` would have swallowed it, so both PNGs were
**deleted before the run** to force regeneration rather than trusted to a green diff.

### The baseline inventory

Captured in the pinned container from a **detached worktree**, never this checkout: `update:docker`
screenshots the working tree, and this one carries five in-progress HTML copy edits from a parallel
session — two of them (`index.html`, `roundtrip.html`) on VR-covered pages.

| PNG | before → after | why |
| --- | --- | --- |
| `build-{neutral,saulera}` | new · 7508px | the tenth page |
| `index-{neutral,saulera}` | 7355 → 8136px | the truncation fix (mostly a footer that was never captured) + the new close-card tier |
| `work-{neutral,saulera}` | 6647 → 6830px | the third exhibit card |
| `approach-{neutral,saulera}` | 5471 → 5471px | same height, different digits — the loc-summary flip |

Nothing else moved. `factory`, `roundtrip`, `contact`, `404` and both proto pages are byte-identical,
which is the empirical half of the claim that the re-measure fix is confined to the two pages with a
`waitVisible` key. The footer is now visible at the bottom of both `index-neutral.png` and
`build-neutral.png`, checked by eye.

## The keyboard-only walk (AC2)

Walked with the keyboard alone at 1440×900, from a fresh load so the sequential-navigation start
point is the top of the document.

**Tab order — 66 stops, and focus cycles cleanly back out to browser chrome.** Skip link first, then
site nav, the capability strip's five source links, Act 0 (file input → colour → derive → clear →
the stage's two sample buttons), one radio per wizard, the breadboard's every control in visual
order, Act 4's source link, Act 5's five buttons, then the footer and the dock. **No focus trap, no
lost focus, and every stop is a real control** — zero `div`s or spans in the tab sequence.

**Every edit verb announces, and every edit verb places focus.** Read off the live region on the
running page, not off the source:

| verb | announcement | focus after |
| --- | --- | --- |
| rename a place | `Place renamed to "Renamed by keyboard".` | stays in the input |
| add an affordance | `Affordance added to "Renamed by keyboard".` | the new chip's name input |
| start a connection | `Pick the place this affordance takes the user to. Press Escape to cancel.` | the first "Connect here" button (2 reachable, real buttons, no roving tabindex) |
| complete it | `Connected to "Progress".` | — |
| Escape | `Connecting cancelled.` | — |
| remove a place | `Removed the place "Settings". 2 of 6. 1 connection went with it.` | "Add place" |
| advance an act | — | the next act's prompt heading; **the next Tab continues into that act**, which is finding 8 closed end to end |

**Negative results, recorded because they are the ones that would otherwise get re-investigated:**

- The 1×1 visually-hidden file input is focusable and *is* visibly focused — `.brand-drop:focus-within`
  (portfolio.css:1379) puts a 2px accent outline on the label. Confirmed at runtime, not read off the CSS.
- The wizards expose only the checked radio to Tab. That is correct native radiogroup behaviour, not a
  defect: `role="radiogroup"`, `aria-labelledby` pointing at the prompt, and ←/↑/→/↓ move within the
  group and write through to the store (verified: unsure → anxious → stuck → anxious, store follows).
- The footer logo link initially looked nameless. **False positive of my walk script**, which did not
  read descendant `img alt`; it is named "ux factory". No defect.
- The breadboard's ×/connect buttons are 28×28 — above WCAG 2.2 AA's 24×24 target minimum.

No unfixed keyboard defect was found on /build.

## Deviations from the plan

1. **#144 finding 13 was already fixed** — `maxlength: String(LABEL_MAX)` landed on both rename inputs
   in `9633d2b` (#137). Confirmed on the live page (60 and 60), so nothing to write. The journey
   asserts it against the exported `LABEL_MAX`, not the literal `60`, so the cap stays one number.

2. **A defect fixed that the plan did not list: `hidden` was inert on two keep-rail tiers.** The plan's
   own edge case says "keep rail hides" — it did not. `hidden` is only a UA rule, so
   `[data-keep-artifacts]`'s and `.bx-keep-share`'s explicit `display: grid` beat it on specificity.
   An emptied board therefore showed "Nothing to keep from the build yet" above four live download
   buttons and a copy-link button, all still wired to `latest` — the last build that existed — because
   `update()` returns early when the board is bare. Fixed page-wide with `[hidden] { display: none
   !important }` rather than a `:not([hidden])` per rule: the per-rule form must be remembered by
   every future edit, and the page-wide one also covers `.brand-import-report`, a portfolio.css rule
   this page reuses and never wrote, which was defeating `hidden` on Act 0's mapping report the same
   way. Cost: 32px of phantom layout removed, so /build's two baselines were re-captured (`694f66c`).

3. **The `!important` was checked in the direction it could break, not just the one it fixes.** "Nothing
   carrying `hidden` renders" is only half a proof; a page-wide `!important` outranks every author rule
   on the page, including shared chrome nobody audited. So the journey now also asserts the un-hide
   direction: a real committed token export imports and the mapping report and tokens download row —
   both `hidden` in the markup, both un-hidden by `build-import.mjs` — actually appear; and the
   appearance dock is confirmed shut before opening and painting all four pack rows plus its actions
   row after, with `dock.mjs`'s own `hidden` element still correctly hidden. Two probes on the way
   there failed for reasons that were **my fixtures, not the page**: a four-token JSON and a
   hand-built ramp were both refused by the import engine for having no near-grey ramp, which is the
   engine working as designed. The committed `tooling/figma/fixtures/scales-dtcg.json` imports
   cleanly, so the assertion uses that and the journey stays self-contained.

4. **`serve.mjs` now resolves extensionless paths to `.html`.** Not in the plan, but the plan's own
   "the links in" edge case says the link must **resolve**, and the journey serves through this file.
   Every in-page link on this site is extensionless (`/work`, `/handoff`, `/agentic-ui-study`, and now
   `/build`), and `serve.mjs` 404'd on all of them — so a driver that clicked a real link landed on a
   404 for a reason that had nothing to do with the site. Cloudflare Pages resolves these; the local
   server now matches its deploy target. No-op for the gate itself: `visual.spec.mjs` requests every
   page by its explicit `.html` URL, and all 18 unrelated baselines are byte-identical.

5. **The re-measure fix is a bounded loop, not a single extra pass.** The plan specified "re-measure
   once and resize if it changed". A resize re-triggers layout, so one extra measurement is only
   correct if it happens to be a fixpoint — true on the machine the planning probe ran on, not
   guaranteed in a container that renders different heights. Three passes, still guarded by
   `if (p.waitVisible)`.

6. **The gate commit was moved before the baseline capture.** The plan's task order was commit code →
   edit the spec → create the worktree. The worktree is created at `HEAD`, so the spec edit would
   still have been uncommitted in the working tree and the capture would have run the old nine-page
   spec — producing no `build` baselines and rewriting nothing. `tooling/` matches no loc-summary
   group regex, so a separate spec commit moves no count.

7. **One extra stale comment corrected**: `verify.yml`'s "29-payload tamper battery" (it is 32;
   `5f610e0` says so in its own commit message and missed the comment three lines away). It was in a
   file this ticket already edits. `tooling/build-checks.mjs:17` carries the same stale number and was
   **left alone** — that file is otherwise untouched here, and an unexplained one-file edit in the
   diff costs a reviewer more than the number is worth. Filed as a follow-up.

8. **`index.html` was staged by synthesized blob, not `git add`.** The working tree carries five
   unrelated in-progress HTML copy edits from a parallel session, and `index.html` is one of them, so
   `git add index.html` would have swept another session's work into this commit. The commit's
   `index.html` was built as `HEAD:index.html` + this ticket's block only, hashed with
   `git hash-object -w` and staged with `git update-index --cacheinfo`. The staged diff was read back
   to confirm it contains exactly the new close-card tier. All five files are still modified and
   unstaged at the end of this ticket, exactly as they were at the start.

## Issues encountered

- **The visual gate's capture defect was real and had been live since #105.** `toHaveScreenshot`
  without `fullPage` captures the viewport, and the viewport was sized from a height measured before
  the `activateOn:'visible'` beat rendered. Nothing caught it because a baseline shorter than its page
  still compares cleanly against itself — the check skipped the thing it tested. `index` grew 781px in
  the container once fixed, most of it the site footer.
- **Both of my first two new assertions were wrong before they were right**, and both were worth the
  detour. "Everything except the empty line is hidden" over-claimed what `build-keep.mjs` contracts —
  the provenance line is the live region and is deliberately left visible — but tightening it is what
  surfaced the real `hidden` bug. And "no buttons are visible" would have passed on a typo'd selector,
  so it now has a control asserting the buttons ARE there first.
- **My keyboard-walk script had two bugs of its own** (`body.focus()` does not reset the
  sequential-navigation start point, so the first pass reported 18 stops for a 66-stop page; and it
  did not read `img alt`, which produced a false "nameless link" finding). Both are recorded above so
  the negative results are not re-investigated.
- The mock Worker is not running for this driver; its `ERR_CONNECTION_REFUSED` is the designed
  fixture-degradation path and is the only console noise the journey forgives.

## Follow-ups filed

- Nav/footer entry for /build — deferred deliberately: chrome renders on every page, so one footer
  item churns all 20 baselines and would contradict this ticket's own "nothing else churned" claim.
- Should /build fire an analytics virtual-route pageview, the way the peak fires `/factory/built`?
  A measurement decision, not an integration one.
- `tooling/build-checks.mjs:17`'s stale "29 hostile payloads" (it is 32).
- CLAUDE.md's dock line said "the three committed packs"; `tokens.plusui.css` (#129) makes it four. Corrected
  in this PR (the map is what this ticket is fixing), and rewritten to name `dock.mjs`'s `PACKS`
  allowlist so it states the mechanism rather than a count that goes stale again.
- #144 keeps findings 9, 10 and 12 — none is reachable on the shipped page.
