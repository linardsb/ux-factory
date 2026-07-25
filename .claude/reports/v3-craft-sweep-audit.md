# v3 craft sweep — §6.4 acceptance bar across every v3 surface

**Ticket**: [#82](https://github.com/linardsb/ux-factory/issues/82) · **Epic**: [#70](https://github.com/linardsb/ux-factory/issues/70)
**Bar**: `.claude/skills/portfolio-design/references/CHECKLIST.md` (the executable form of PRD §6.4)
**Date**: 2026-07-25 · **Branch**: `chore/v3-merge-vr-reblock` · **Base**: `d67a2cd`

Every row below is a measurement, not an assertion. Where a check passed, the measured value is
printed next to it. Where a check failed, it was fixed in this pass and re-measured.

---

## Method

The per-ticket plans (#71–#81) each self-audited their own surface, so this sweep deliberately
spends its budget on what a per-surface audit structurally cannot see:

1. **Cross-engine reality.** The CI gate runs one bundled Chromium. Real Safari and real Chrome
   blowouts have shipped through it before (PR #54). Every surface was driven in **Chromium
   147.0.7727.15 · Firefox 148.0.2 · WebKit 26.4** from the local Playwright install, over
   `python3 -m http.server 4757` (never `file://`).
2. **The seams between surfaces.** The pack control's behaviour as a reader moves page to page, and
   the transition into and out of the inline derived pack — neither exists on any single surface.
3. **MUSTs the eye does not catch.** Rest-equals-final under reduced motion, measured by hashing
   two frames 3.1s apart. Focus indicators, measured by walking the real Tab order.

Scripts are throwaway harnesses, not committed tooling — this repo has no test suite and CLAUDE.md
forbids inventing one. Each is reproducible from the commands recorded in the sections below.

**Two expectations, recorded so a re-runner does not chase them as defects:**

- `ERR_CONNECTION_REFUSED` to `127.0.0.1:8787` on work / proto / instance is the designed
  Worker-absent fixture degradation. Chromium and WebKit log it with the URL in `location()` rather
  than in the message text, so a classifier keying on message text alone reports false failures.
- `index.html`'s hero runs a canned re-skin ~2.4s after load. Every index measurement below waited
  3.4s so it reads settled colour, not a mid-flush frame.
- **A closed `<details>` still reports layout.** Its subtree is `content-visibility: hidden`, so it
  has a `clientWidth`, a `getBoundingClientRect()` and a non-null `offsetParent` — but it is not
  painted and not focusable, and the width it reports is an *unconstrained* one. `el.hidden` and
  `display: none` both miss it; `el.checkVisibility({ contentVisibilityAuto: true })` catches it.
  This produced one wrong measurement in this pass before it was caught — see F-2.

---

## The MUST matrix

10 surfaces × 3 engines. `A11y` = focus indicators + reduced-motion rest state. `Layout` = nothing
clipped past the viewport at 1280 or 360 without its own scroll container. `Honesty` = fictional /
real-run labels present in the at-rest DOM, outside any closed disclosure. `Console` = zero errors
other than the Worker-absent ones.

| Surface | Console (all 3 engines) | Layout 1280 | Layout 360 | Reduced-motion rest | Focus indicators | Honesty labels at rest |
| --- | --- | --- | --- | --- | --- | --- |
| `index.html` | PASS 0 err | PASS | PASS | PASS (frames identical) | PASS 38 stops | PASS 4/4 visible |
| `approach.html` | PASS 0 err | PASS (code in `pre.asrc-code`, scrolls) | PASS (same) | PASS | PASS 33 stops | N/A — nothing fictional |
| `work.html` | PASS 0 err (12 Worker-absent ignored) | PASS | PASS | PASS | PASS 58 stops † | PASS 1/1 visible |
| `factory.html` | PASS 0 err | PASS | PASS | PASS | PASS 31 stops | PASS 2 at rest ‡ |
| `contact.html` | PASS 0 err | PASS | PASS | PASS | PASS 20 stops | N/A |
| `404.html` | PASS 0 err | PASS | PASS | PASS | PASS 20 stops | N/A |
| `roundtrip.html` | PASS 0 err | PASS | **FIXED** — accordions blew the viewport once opened | PASS | PASS 35 stops | PASS 3/3 visible |
| `instance.html` | PASS 0 err | PASS | **FIXED** — hero + matrix were clipped | PASS | PASS 73 stops | PASS 6/6 visible |
| `proto/verdant.html` | PASS 0 err (6 ignored) | PASS | PASS | PASS | PASS 20 stops | PASS 3/3 visible |
| `proto/fieldwork.html` | PASS 0 err (6 ignored) | PASS (board scrolls in `.proto-frame-board`) | PASS (same) | PASS | see observation O-1 | PASS 3/3 visible |

† `work.html`'s Tab walk reports `iframe.factory-embed`, `vd-plant-card` and `vd-care-task-row` as
having no indicator. Both are measurement artifacts, verified: the iframe host is not the focused
element (focus is inside its document), and the two custom elements put focus on a shadow-root
child whose computed style is `outline: solid 2px` — measured directly via
`document.activeElement.shadowRoot.activeElement`. No defect.

‡ `factory.html` carries 6 honesty strings; 4 sit inside the tabbed viewer's inactive panels. Those
4 are trace *content*, not labels. The two labels — "Real run · replayed" and "Real run, curated for
length" — are both at rest, outside any disclosure, which is what the contract requires.

---

## Findings fixed in this pass

Three CHECKLIST MUST failures, all in the **Layout & cross-browser** group, all reproducing
identically in Chromium and WebKit. These are sweep-found defects, distinct from hallway findings,
and are not counted against D10's one-fix budget.

### F-1 · `instance.html` hero lost its last four words at 360px

`.hl` carries `white-space: nowrap` (`system/portfolio.css:99`) so the accent underline never breaks
mid-phrase. On instance.html the highlighted phrase is "your own product vision" — measured at
**407px inside a 312px column**, so `body { overflow-x: clip }` cut it off with nothing to scroll.
The private-instance hero is the first thing a real company sees, and on a phone it read
"The factory, run on your own prod".

Measured across every page's `.hl` at 360px before fixing: index −87px, approach −84, work −64,
factory −95, contact −95, 404 −57, roundtrip −57, **instance +71**. One surface over the line, so
the fix is scoped rather than a system-wide nowrap removal.

Fix: `system/portfolio.css` — release the nowrap below 640px only, with `box-decoration-break: clone`
so the draw-in gradient still paints on each wrapped fragment. Zero effect at any captured width.

Because the fix has a hard `max-width: 640px` boundary while the h1 font-size is a viewport clamp,
the boundary itself was swept in both engines — 360 / 390 / 480 / 600 / 640 / **641** / 768 / 1024 /
1280. Every width clears, and 641px (where nowrap returns) clears by 210px at a 40px h1. Eyeballed
at 360 in WebKit: the phrase reads in full across two lines with the accent underline drawn on both
fragments.

### F-2 · `roundtrip.html` accordions blew past the viewport once opened at 360px

**The first measurement of this was wrong, and the correction is the finding.** The initial probe
reported `.rt-diff-table` at 386px (Chromium) / 389px (WebKit) in a 360px viewport with no
`overflow-x` ancestor. Wrapping each table in `div.rt-table-scroll` made the geometry probe report
PASS — and the defect was still there. The tables sit inside closed `<details>`, so what was
measured was a `content-visibility: hidden` subtree laying out unconstrained (see Method).

Re-measured the way a reader meets it — click each summary open at 360px — and the real cause
showed: `.rt-accordions` and `.cs-acc` are both `display: grid`, and a grid item's default
`min-width: auto` floors it at min-content. The wide table dragged the whole track to **381px in a
360px viewport**, so `body { overflow-x: clip }` cut the accordion itself off. The wrapper could not
scroll because it was never constrained. This is the recorded PR #54 trap, one level up from where
it was looked for.

Fix, three parts, all needed:

1. `system/portfolio.css` — `.cs-acc > *, .rt-accordions > * { min-width: 0; }` so the track can
   shrink to its container.
2. `system/derivation-roundtrip.mjs` — each table wrapped in `div.rt-table-scroll`
   (`overflow-x: auto`), which now actually scrolls because of (1).
3. `system/derivation-roundtrip.mjs` — a scroll region is useless to a keyboard reader if it cannot
   be focused, and **no engine grants that automatically here** (measured: Chromium, Firefox and
   WebKit all skip it). `syncScrollers` gives each wrapper `tabindex="0"`, `role="region"` and an
   `aria-label` taken from its accordion summary **only while it actually overflows**, re-run on
   resize and on any accordion toggle — so wide viewports gain no empty tab stops.

This also covers `factory.html`, which mounts the same module.

Measured after the fix, accordions opened, all three engines at 360px: **0 elements past the
viewport**, 3 wrappers scrolling, exactly 3 focusable. At 1280px: 0 scrolling, 0 focusable, so the
desktop tab order is untouched. Tab from an accordion summary lands on the region with a visible
`outline: solid 2px` in Chromium and WebKit. Eyeballed at 360 in WebKit: the accordion fits its
card and the last column scrolls inside it.

### F-3 · `instance.html` Manipulation Matrix clipped 65px at 360px

`.fw-matrix` is `grid-template-columns: max-content 1fr 1fr` (`instance.html:139`). At 360px the
`max-content` rowhead consumes the row and the two quadrant buttons have no `min-width: 0`, so they
overflowed to 425px — the recorded PR #54 trap. The reader could not see or reach the right-hand
quadrant of the ethics gate.

Fix: extend the existing `@media (max-width: 640px)` block to two columns with each rowhead as a
full-width section label, plus `min-width: 0` on the quadrants. The grid still reads as yes/no ×
yes/no. `instance.html` is not in the VR matrix (deep-link-only, off the five-page IA), so nothing
is baselined here — it is audited, per the plan's assumption 5.

**Verification after all three.** Two different checks, named so it is clear which one ran:

- *Geometric* — the wide-element probe, re-run in Chromium and WebKit with visibility filtered
  through `checkVisibility({ contentVisibilityAuto: true })`. `instance` reports *none past the
  viewport* (quadrants now end at 176/303 in a 360px viewport, `.hl` at 266; before the fix they
  were 425 and 431). `roundtrip` with every accordion opened reports *none past the viewport* in
  Chromium, Firefox and WebKit. The only elements still extending past the viewport anywhere are
  `approach`'s `code` inside `pre.asrc-code` and `fieldwork`'s board inside `.proto-frame-board` —
  both in their own scroll container that fits, which is the MUST satisfied, not violated.
- *Eyeball* — the CHECKLIST MUST is literally "eyeball every new layout in real Safari AND real
  Chrome", and F-3 rearranged a grid, which is exactly where geometry passes and reading breaks. All
  three changed layouts were screenshotted at 360px in WebKit at 2× and read: the matrix still reads
  as yes/no × yes/no with both column headers on screen above both rows of quadrants; the hero
  phrase reads in full; the accordion sits inside its card with the last column scrolling.

**Baseline impact: none.** Verified, not assumed — the pinned Docker gate was run against the
committed baselines after the fixes:

```
docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression \
  mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
→ 18 passed (22.8s)
```

All three fixes are scoped below 640px or are inert at desktop width, which is why they churn
nothing. The full regen still runs in Phase C for whatever the hallway fix disturbs.

---

## Observations recorded, not fixed

### O-1 · `proto/fieldwork.html` exposes zero focusable elements

Measured: `0` matches for `a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]),
summary` on the standalone page — against 20 on `proto/verdant.html`. Neither proto page carries site
chrome (by design; the VR spec treats them as `kind: 'proto'` and never waits for a header).

A keyboard reader who deep-links to fieldwork has nothing to operate and no in-page way out. Whether
the hybrid canvas is *meant* to be operable is a design decision, not a defect the sweep can settle —
verdant's cards are interactive components, fieldwork's board is a rendered composition. Flagged for
the owner as a follow-up ticket rather than fixed here; a fix would add interactive surface, which
this ticket's non-goals exclude.

### O-2 · WebKit does not arrow-scroll a focused overflow container

Measured at 360px with a `.rt-table-scroll` region focused: `ArrowRight` moves `scrollLeft` 0 → 40
in Chromium and 0 → 0 in WebKit. The region is focusable and announced in both; Safari simply does
not map arrow keys onto a focused scroller, and no CSS or markup here changes that. Touch, trackpad
and shift-wheel all scroll it normally. Recorded rather than worked around — a JS key handler on a
scroll region would be inventing a control the platform already owns everywhere else.

### O-3 · Two measurement traps worth keeping

Recorded above in Method, repeated here because each cost a re-run in this pass and all three will
recur: resource-failure classification must read `consoleMessage.location().url`, not the message
text; a Tab-order audit must descend into `shadowRoot.activeElement` or every web component reads as
a missing focus ring; and a layout probe must filter on
`checkVisibility({ contentVisibilityAuto: true })` or a closed `<details>` hands back real-looking
numbers for an unconstrained subtree — which is how F-2 was first measured wrong, and would have
been signed off as fixed while still broken.

---

## Seam checks — what no single surface can show

14 assertions, run end to end in one browser context so `localStorage` carries across navigations
like a real visit. **All 14 pass in Chromium and in WebKit** (28/28).

| # | Seam | Measured |
| --- | --- | --- |
| 1 | index starts neutral, nothing worn | `link=/system/tokens.neutral.css` · `selector=null` |
| 2 | dock swaps to saulera in place | `link=/system/tokens.saulera.css` |
| 3 | saulera survives navigation (pre-paint link swap) | approach loads already on saulera |
| 4 | still worn two pages later | `accent=#F59E0B` on work |
| 5 | a brand colour derives an inline pack | 16 inline `--color-*` props · `accent=#7b3fe4` |
| 6 | derived beats the worn committed pack | `computed=#7b3fe4` while saulera is the stylesheet |
| 7 | "wear it across the site" records the selector | `selector=derived` · record written |
| 8 | derived re-applies pre-paint on the next page | 16 props, same accent, on factory |
| 9 | derived page keeps the neutral stylesheet under the props | `link=/system/tokens.neutral.css` |
| 10 | **switching to a committed pack clears every inline prop** | `0` left · `computed=#F59E0B` |
| 11 | the committed pack actually takes the accent over | matches saulera's own value |
| 12 | switching back restores the derived pack | `accent=#7b3fe4` · link back to neutral |
| 13 | reset clears props and stops wearing anything | `inline=0` · `selector=neutral` |
| 14 | reset survives navigation | contact loads plain neutral |

Rows 10 and 12 are the recorded trap this sweep existed to check: a `removeProperty` of the
`--color-*` set is what strips an inline derived pack, so the derived → committed → derived
transition is exactly where it would break. It does not. Row 13 records that reset writes an
explicit `neutral` selector rather than deleting the key — `pack-boot.js` treats anything that is
not `saulera` / `verdant` / `derived` as its guaranteed no-op, so both forms are correct, and the
no-op default the VR gate depends on is preserved.

---

## Token & pipeline discipline

| Check | Result |
| --- | --- |
| `node tooling/drift-check.mjs` | ✓ syntax · token-css · annotated-source · loc-summary · system-graph · handoff · scenarios · traces |
| `node tooling/token-lint.mjs` | ✓ 64 contract tokens · 0 undeclared · 0 orphan · DTCG valid |
| Zero literals in `components.css` | untouched by this pass |
| VR baselines current | 18 passed against committed baselines, post-fix |

The three fixes touch `system/portfolio.css`, `system/derivation-roundtrip.mjs` and
`instance.html`'s page-scoped style block. No token was added, so no regen chain is triggered by
this pass; `loc-summary` counts `system/*`, root/proto HTML and `agent-layer/*.mjs` only, so the new
`docs/` and `.claude/` files in this ticket do not move it either (confirmed by drift-check above,
run after the files were written).

---

## Spine-completion instrumentation (AC #6)

Present and wired, confirmed rather than re-built: `trackFactoryBuilt()` at
`system/analytics.mjs:58`, called from `system/peak.mjs:244` on the built-screen success path — after
every fallback has returned, so a build that fell through to the still cannot count as a reach.
`BEACON_TOKEN` and `PRODUCTION_HOST` stay `""` by design; filling them is a launch step, not this
ticket.

---

## What this sweep does not cover

Stated so the record is honest about its own edges:

- **The hypothesis.** Every check here proves nothing broke, not that the experience works. That is
  what the two hallway rounds are for (`docs/hallway-runbook.md`).
- **Real devices.** WebKit 26.4 under Playwright is Safari's engine, not an iPhone. Touch targets,
  real scroll physics and iOS Safari chrome are unmeasured.
- **Performance under throttle.** The CHECKLIST's "no dropped frames on a low-end throttle" was
  measured per-surface at build time by each ticket (spike 1's decision rule) and is not re-run here.
- **The deep unlisted benches** (`derive.html`, `agentic.html`, `trace.html`, `handoff.html`,
  `agentic-ui-study.html`). Off the v3 surface list; not swept.
