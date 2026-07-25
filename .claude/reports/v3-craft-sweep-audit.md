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
| `roundtrip.html` | PASS 0 err | PASS | **FIXED** — diff table was clipped | PASS | PASS 35 stops | PASS 3/3 visible |
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

### F-2 · `roundtrip.html` diff tables clipped their last column at 360px

`.rt-diff-table` is `width: 100%`, but a table cannot shrink below its min-content — measured
**386px (Chromium) / 389px (WebKit) in a 360px viewport**, with no `overflow-x` ancestor anywhere
up the chain to `body`. The CHECKLIST MUST is explicit: wide content scrolls in its own container.

Fix: `system/derivation-roundtrip.mjs` wraps each table in `div.rt-table-scroll`, styled
`overflow-x: auto` in `system/portfolio.css`. Inert at desktop widths where the table already fits.
This also covers `factory.html`, which mounts the same module (its panel is hidden by default, so
the sweep could not measure it there).

### F-3 · `instance.html` Manipulation Matrix clipped 65px at 360px

`.fw-matrix` is `grid-template-columns: max-content 1fr 1fr` (`instance.html:139`). At 360px the
`max-content` rowhead consumes the row and the two quadrant buttons have no `min-width: 0`, so they
overflowed to 425px — the recorded PR #54 trap. The reader could not see or reach the right-hand
quadrant of the ethics gate.

Fix: extend the existing `@media (max-width: 640px)` block to two columns with each rowhead as a
full-width section label, plus `min-width: 0` on the quadrants. The grid still reads as yes/no ×
yes/no. `instance.html` is not in the VR matrix (deep-link-only, off the five-page IA), so nothing
is baselined here — it is audited, per the plan's assumption 5.

**Verification after all three:** re-ran the wide-element probe in Chromium and WebKit. `instance`
reports *none past the viewport*; `roundtrip`'s table now reports
`container=div.rt-table-scroll containerFits=true`. The only elements still extending past the
viewport anywhere are `approach`'s `code` inside `pre.asrc-code` and `fieldwork`'s board inside
`.proto-frame-board` — both in their own scroll container that fits, which is the MUST satisfied,
not violated.

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

### O-2 · Two measurement traps worth keeping

Recorded above in Method, repeated here because both cost time in this pass and both will recur:
resource-failure classification must read `consoleMessage.location().url`, not the message text; and
a Tab-order audit must descend into `shadowRoot.activeElement` or every web component reads as a
missing focus ring.

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
