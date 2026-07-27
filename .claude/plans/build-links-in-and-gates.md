# Feature: /build slice 1d — links in from home + work, and all gates

The following plan should be complete, but it's important that you validate documentation and
codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types and modules. Import from the right files.

**Closes #138.** Part of epic #134 (`.claude/plans/hooked-shapeup-pattern-builder.md` Phase 1.5).
Depends on #135 · #136 · #137 — **all three are merged** (PRs #141, #142, #143, #145, #146). The
page is feature-complete; this slice is the one that makes it *part of the site* and *measured*.

## Feature Description

/build ships today as a complete, working, six-beat page that **nothing links to**. Its own head
comment says so: *"The page is NOT linked from the IA yet."* This slice makes that sentence false
and then proves the page holds up: linked from the home close beat and the work proof index,
screenshotted under both packs by the visual-regression gate, counted by the loc-summary artifact,
driven end-to-end under three browser engines, walked keyboard-only, and written into the
architecture map so the next reader of CLAUDE.md knows the surface exists.

It also closes three keyboard/robustness findings on the newly-linked page (#144 items 7, 8, 13 —
owner's call, see Open Questions), and repairs a **measured defect in the visual gate itself**: the
capture viewport is sized from a height measured *before* the last-settling content renders, so on
`index` the bottom **585 px — the entire site footer — has never been in the baseline**. Evidence and
the proven fix are in NOTES.

## User Story

As a hiring manager who has just watched a design system build itself on the home page
I want an obvious next action that puts *my* product and *my* design tokens through the same method
So that the demo stops being about the candidate's fictional company and starts being about mine —
and as the person maintaining this repo, I want that page held to the same gates as every other
shipped page, so it cannot rot silently.

## Problem Statement

Three gaps, one ticket:

1. **Unreachable.** A visitor can only reach /build by being told the URL. The epic's whole thesis
   — the visitor's tokens + the visitor's product + the candidate's method — is behind a door with
   no handle.
2. **Unmeasured.** /build is 10 modules and ~1,300 lines of view-time behaviour with **zero** pixel
   coverage, no cross-engine proof, and no keyboard walk. `tooling/build-checks.mjs` covers the
   pure chain (rules, codec, SVG, vetting) but never opens a browser.
3. **Undocumented.** `CLAUDE.md`'s architecture map has **no entry** for build.html, for any of the
   seven `system/build-*`/`breadboard`/`pattern-*` modules, or for the three `pack-import`/
   `brand-import`/`pack-imported` modules #133 shipped. The map is the file every session reads
   first, and it is currently wrong about an entire public surface.

## Solution Statement

Five moves, in dependency order:

```
1  link in       index.html close card + work.html "Run it" grid — STATIC markup, no new JS
2  a11y          keyboard walk of the whole page + #144's 7, 8, 13 (focus, announce, maxlength)
3  measure       gen-loc-summary regen (+ approach baselines ONLY if the runtime group flips)
4  pixels        /build added to visual.spec.mjs under both packs (9→10 pages, 18→20 PNGs)
                 + the re-measure fix that stops the capture truncating index and build
5  prove + write tooling/build-journey.mjs ×3 engines · CLAUDE.md map · plan/report/review in the PR
```

The link is **static markup**, not a `close.mjs` addition. That is the simplest thing that works, it
survives JavaScript being off (CLAUDE.md's documented-degradation rule, which `close.mjs`'s own
header invokes), and it sidesteps the one-shot-snapshot bug class the ticket warns about by having
no snapshot to take. `close.mjs` is not touched.

## Out of Scope / Non-Goals

- **Not adding /build to the nav or the footer index.** `client.neutral.config.js` calls the footer
  "the full site index" and /build now belongs in it — but chrome renders on every page, so one
  footer item churns **all 20 baselines** and contradicts this ticket's own "nothing else churned"
  requirement. Deferred deliberately; record it as a follow-up issue with that reasoning so it does
  not read as an oversight.
- **Not removing build.html's `<meta name="robots" content="noindex">`.** Epic AC2 states noindex,
  and `_headers` sets `X-Robots-Tag: noindex` site-wide anyway. Launch-time decision, not this one.
- **Not fixing #144 items 9, 10, 12** (the two latent enum/id-collision issues and the no-go count
  copy nit). None is reachable on the shipped page; they stay on #144.
- **Not registering the journey in CI** (owner's call). It is committed and re-runnable; the
  three-engine pass is an operator step recorded in the report.
- **Not removing the D11 VR-freeze line** in `verify.yml` — that is #82's job, and this branch is
  not `feature/v3-*` so the gate blocks normally here regardless.
- **Not changing** any /build behaviour beyond the three #144 fixes, `close.mjs`, `derive.mjs`,
  the dock's packs, or the pattern library (that is #139).

## Feature Metadata

**Feature Type**: Enhancement (integration + gates)
**Estimated Complexity**: Medium — small code diff, high-consequence artifact churn
**Primary Systems Affected**: `index.html`, `work.html`, `build.html` (comment), `system/breadboard.mjs`,
`system/build-questions.mjs`, `tooling/visual-regression/visual.spec.mjs` + baselines,
`system/loc-summary.json`, new `tooling/build-journey.mjs`, `CLAUDE.md`, `.github/workflows/verify.yml` (comment)
**Dependencies**: none new. Playwright is reached through `tooling/visual-regression/node_modules`
(1.61.1 — the pinned CI version), never added to the repo root.

## Related Work

**Implements**: #138 · **Epic**: #134 / `.claude/plans/hooked-shapeup-pattern-builder.md` (Phase 1.5)

**Back-references**:

- `.claude/plans/build-page-import-act.md` (#135) — the page skeleton and Act 0 this links to
- `.claude/plans/build-questions-breadboard.md` (#136) — the two wizards + breadboard being a11y-walked
- `.claude/plans/build-pattern-render-keep-rail.md` (#137) — the pattern chain; its scratch journey
  is this ticket's committed script
- `.claude/plans/visual-regression-gate.md` (#9) — the gate being extended; its capture-flow reasoning
- `.claude/plans/v3-investment-close.md` (#77) — the close beat gaining the link
- `.claude/plans/v3-approach-tightened-work-proof-index.md` (#80) — work.html's proof-index grammar

**Forward-references**:

- (create on merge) footer/nav entry for /build — deferred here for baseline blast radius
- #139 slice 2 · #140 slice 3 — both unblocked by slice 1 merging

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `index.html:292-320` — the `#beat-close` band: `.close-card` → `.hero-cta-row` (Get in touch) →
  `.close-takeaway` (line + two buttons) → `.close-extras[data-close-extras]` (JS mount).
  **Why**: the new link is a static sibling block; `.close-takeaway` is the grammar to mirror.
- `system/close.mjs` — **read it, do not edit it.** Its header states the documented-degradation
  contract ("everything here is additive… the close card in index.html stands on its own"). Why the
  link is markup and not an appended node.
- `work.html:170-215` — the "Run it" band: `.beat-title` "Two demos you can drive right now.", the
  `.beat-lead`, and `.grid.grid-2.mt-2xl.stagger` holding two `a.card.card-link` exhibits with
  `.card-kicker` "Exhibit 0N `<span class="capability live">Runs now</span>`".
  **Why**: the third exhibit card goes here; copy and grid class both change.
- `work.html:408-446` — the "More proof" `.row-list`. **Why**: the rejected alternative placement —
  /build is a demo you *drive*, not evidence you *read*. Named so the choice isn't re-litigated.
- `system/components.css:591` — `.grid-3 { grid-template-columns: repeat(3, 1fr); }`, and `:595`
  collapses `.grid-3` to `1fr` at the mobile breakpoint. **Why**: grid-2 → grid-3 is a class swap.
- `build.html:12-25` — the head comment ending "The page is NOT linked from the IA yet."
  **Why**: that sentence becomes false; this repo does not ship stale comments.
- `tooling/visual-regression/visual.spec.mjs` — **read the whole file.** `PAGES` (10 entries after
  this change), the header comment "Screenshots nine shipped pages" (stale → ten), the `waitReady`
  array handling, the single-selector `waitVisible` (`p.waitVisible` → `page.locator(...).first()`),
  and the measure → `setViewportSize` → waitVisible → `toHaveScreenshot` order at the bottom.
  **Why**: both the new entry and the re-measure fix land here.
- `tooling/visual-regression/playwright.config.mjs` — `maxDiffPixels: 100`, `animations:'disabled'`,
  `snapshotPathTemplate` → `baselines/{arg}{ext}`. **Why**: the 100-px tolerance is what hides a
  few-changed-digits diff (see the approach-baseline task).
- `tooling/visual-regression/serve.mjs` — zero-dep static server, repo root, `PORT` env.
  **Why**: the journey script serves through this, not `python3 -m http.server`.
- `system/pattern-render.mjs:168-211` — `render()` **returns at :185 while `vocab` is null** and only
  sets `root.dataset.patternStage = "ready"` at :194; `loadVocab()` is behind an
  `IntersectionObserver` with `rootMargin: "800px 0px"` (:202-208). **Why**: this handle CANNOT go in
  `waitReady` — it would deadlock the gate. Measured proof in NOTES.
- Settled-state handles that DO resolve at load — `system/build-import.mjs:554`
  (`data-build-import`), `system/build-questions.mjs:472` (`data-build-questions`, **two mounts**)
  and `:526` (`data-build-verdict`), `system/breadboard.mjs:678` (`data-breadboard`),
  `system/build-keep.mjs:321` (`data-build-keep`, set in a `.finally()` after the `?b=` restore
  attempt). **Why**: these five are the `waitReady` list; no new handle needs inventing.
- `agent-layer/gen-loc-summary.mjs:22-27` — the three group regexes. `runtime` matches
  `^system/(wc/)?[^/]+\.(css|mjs|js)$`; `tooling/` matches **nothing**. Line counts come from
  `git show :<path>` — the **index**, not the working tree. **Why**: stage before you regenerate,
  and `tooling/build-journey.mjs` cannot move any number.
- `system/loc-summary.json` — currently runtime 17000 / pages 5000 / generators 2000 / total 24100.
- `system/build-keep.mjs:80` — `new Date().toISOString()` lives in the **downloaded** markdown only,
  never in the DOM. **Why**: verified VR-safe; don't go hunting for a date-churn bug that isn't there.
- `system/dock.mjs:443-447` — `stripHash()` carries `location.search` through, explicitly naming
  /build's `?b=`. **Why**: the journey asserts this rather than the plan assuming it.
- `system/build-import.mjs:53,420-421` — `MAX_EXPORT_BYTES = 32 * 1024 * 1024` and the over-cap
  refusal message. **Why**: the "33 MB refusal" edge case asserts against the real constant.
- `.github/workflows/verify.yml:9-11` — the `visual` gate's stale comment ("6 IA + 2 data-connected
  proto"). **Why**: same staleness as the spec header; fix both or neither.
- `.claude/code-reviews/pr-145-review.md` · `.claude/reports/build-pattern-render-keep-rail-report.md`
  — how #137 validated (43-assertion journey, Chromium only, scratch). **Why**: the standard to meet
  and exceed.
- `CLAUDE.md` "Architecture map" — the `system/` block and the shipped-pages line. **Why**: the
  entries to add, in the established one-line-per-module voice.

### New Files to Create

- `tooling/build-journey.mjs` — the committed cross-engine full-journey driver. **Seed it from the
  #137 script, preserved at**
  `/private/tmp/claude-501/-Users-Berzins-Desktop-Linards-current-ux-factory/36714bf7-ba04-4da1-bd78-0336701802a0/scratchpad/journey-137.mjs`
  (43 assertions, Chromium-only, `python3 -m http.server`). Rewrite the header + launcher, keep the
  assertions.
- `tooling/visual-regression/baselines/build-neutral.png` · `build-saulera.png` — new, generated.
- `.claude/reports/build-links-in-and-gates-report.md` — written at the end, committed in the PR.
- `.claude/code-reviews/pr-<N>-review.md` — the review, committed in the PR (repo convention: four
  of PRs #97–#100's artifacts were written and lost to a worktree removal).

### Relevant Documentation — READ BEFORE IMPLEMENTING

- [Playwright `toHaveScreenshot`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1)
  — "two consecutive stable screenshots"; without `fullPage` the capture is **viewport-sized**, which
  is exactly why a viewport shorter than the document silently truncates.
- [Playwright `page.setViewportSize`](https://playwright.dev/docs/api/class-page#page-set-viewport-size)
  — resizing triggers relayout; the spec's `text-wrap`/`min-height` normalisation exists for this.
- [WAI-ARIA APG — keyboard interaction conventions](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
  — the standard the breadboard editor's rename/add/remove/reconnect verbs are walked against.
- [MDN `aria-live`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
  — for #144 finding 7: the announcement must state the connection loss, not just the place removal.

### Patterns to Follow

**Static-first on shipped pages.** Every close-card action today is markup; `close.mjs` only *adds*.
Follow that — the new link is an `<a class="btn …">` in `index.html`.

**Card grammar on work.html** (work.html:184-196, verbatim shape to mirror):

```html
<a class="card card-link" href="/build">
  <div class="card-body">
    <div class="card-kicker">Exhibit 03 <span class="capability live">Runs now</span></div>
    <h3 class="h3 mb-md">…</h3>
    <p class="muted">…</p>
    <div class="card-foot"><span class="card-foot-link">… →</span></div>
  </div>
</a>
```

**VR entry shape** (mirroring the `index` entry — the only other page with a `waitVisible`):

```js
{ name: 'build', url: '/build.html', kind: 'ia',
  waitReady: ['[data-build-import="ready"]', '[data-build-questions="ready"]',
              '[data-build-verdict="ready"]', '[data-breadboard="ready"]',
              '[data-build-keep="ready"]'],
  waitVisible: '[data-pattern-stage="ready"]' },
```

All **five** load-time handles, matching the probe. `[data-build-questions="ready"]` has **two**
mounts (one per act); the spec's loop uses `.first()`, so listing it once is correct and waits for
whichever wizard settles first — both settled at 2 ms in the probe, and `build-checks` already
guards the pair, so a one-mount regression is caught there rather than here.

**Playwright from outside the VR package** (proven in planning — the journey script's launcher):

```js
import { createRequire } from 'node:module';
const VRDIR = new URL('./visual-regression/', import.meta.url).pathname; // tooling/visual-regression
const require = createRequire(`${VRDIR}`);
const pw = require(require.resolve('@playwright/test', { paths: [VRDIR] }));
```

**File headers cite the governing doc.** `tooling/build-journey.mjs` opens with
`// tooling/build-journey.mjs — … (epic #134, ticket #138; .claude/plans/build-links-in-and-gates.md)`,
following `tooling/build-checks.mjs`'s header exactly — including why it is committed.

**Gate output grammar** — `tooling/build-checks.mjs:47-54`: one `✓ name detail` line per group,
`✗` with the failure list, `exit 1` on any failure. The journey prints the same shape per engine.

---

## IMPLEMENTATION PLAN

### Phase 0 — branch hygiene

The current branch `feature/review-followups-138` is **1 commit behind `origin/main`** (the #146
merge) and the working tree carries **5 uncommitted HTML copy edits** (`derive.html`, `index.html`,
`instance.html`, `roundtrip.html`, `trace.html`) that are **not this ticket's** — parallel sessions
share this working directory (memory: shared-worktree-parallel-sessions). Branch fresh from
`origin/main`, **stage by explicit path only**, never `git add -A`, and never `git stash` (you may be
stashing another session's live work).

### Phase 1 — the links in (+ the build.html comment)

**Independent of:** everything below. Small, and it is what the ticket is *for*.

### Phase 2 — a11y pass + #144 items 7, 8, 13

**Independent of:** Phase 1. Must land **before** Phase 3 — it edits two `system/*.mjs` files, so it
moves the loc-summary runtime count.

### Phase 3 — loc-summary

**Depends on:** Phases 1–2 staged (the generator reads the git index, not the tree).

### Phase 4 — the visual gate

**Depends on:** Phases 1–3 committed. Two parts, in this order: (a) the spec change (new entry +
the re-measure fix + the two stale comments), (b) the baseline capture, from a **clean detached
worktree**, as its own `chore(visual):` commit.

### Phase 5 — cross-engine journey + docs

**Depends on:** Phase 1 (the journey asserts the links resolve). Independent of Phase 4.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently validated.

### CREATE the branch

- **IMPLEMENT**: `git fetch origin && git switch -c feature/build-links-gates-138 origin/main`
- **GOTCHA**: 5 unrelated modified HTML files are in the shared working tree and will follow you onto
  the new branch. **Leave them alone.** Stage every commit by explicit path. `git status` should show
  them as still-modified when you are done.
- **VALIDATE**: `git log --oneline -1` shows `c734af6` (the #146 merge) as HEAD's parent;
  `git status --short` still lists the 5 unrelated files as ` M`.
- **SATISFIES**: prerequisite

### UPDATE `index.html` — the close beat gains "now build yours"

- **IMPLEMENT**: a static block inside `.close-card`, after `.close-takeaway` and before
  `<div class="close-extras" data-close-extras></div>`. Mirror `.close-takeaway`'s structure: one
  `<p>` line + a row holding a single `<a class="btn btn-secondary" href="/build">`. Copy must be
  method-true and honest — this beat's thesis is "you keep what it builds", and /build is the
  visitor doing the building. Reuse the existing `.close-takeaway` / `.close-takeaway-row` classes
  rather than inventing new ones (no `portfolio.css` change needed); if the design genuinely needs a
  distinct treatment, run it under `.claude/skills/portfolio-design` and add the class there.
- **PATTERN**: `index.html:305-316` (`.close-takeaway`).
- **GOTCHA**: `href="/build"` extensionless — CF Pages and `npx serve` both resolve it
  (`client.neutral.config.js` header states the convention). Do **not** touch `system/close.mjs`;
  a JS-appended action would break the documented JS-off degradation and re-open the one-shot bug
  class the ticket warns about.
- **VALIDATE**: `npx serve .` → home → the close card shows the action, it navigates to /build, and
  with JS disabled it is still present and still navigates.
- **SATISFIES**: AC1

### UPDATE `work.html` — the third exhibit

- **IMPLEMENT**: add an "Exhibit 03 · Runs now" `a.card.card-link` → `/build` to the "Run it" grid;
  change `grid-2` → `grid-3` on that grid; update the `.beat-title` ("Two demos you can drive right
  now." → three) and the `.beat-lead` so it names all three. The card says what the visitor does
  (bring their own tokens, answer the method questions, get a pattern + a share link).
- **PATTERN**: `work.html:184-208`; `.grid-3` at `system/components.css:591` (collapses to one
  column at the mobile breakpoint, `:595`).
- **GOTCHA**: the heading and lead are *counts* — leaving them at "Two" while three cards render is
  exactly the class of copy-contradicts-state bug this repo keeps catching in review.
- **VALIDATE**: `npx serve .` → /work → three cards, one row at 1280 px, stacked at 640 px; link
  resolves; no horizontal overflow at either width.
- **SATISFIES**: AC1

### UPDATE `build.html` — the head comment is now false

- **IMPLEMENT**: replace "The page is NOT linked from the IA yet." with what is now true (linked
  from the home close beat and the work proof index; still off-nav and still `noindex`), and add
  `#138` to the ticket list in that comment.
- **VALIDATE**: `grep -n "NOT linked" build.html` returns nothing.
- **SATISFIES**: AC1

### UPDATE `system/breadboard.mjs` + `system/build-questions.mjs` — #144 items 7, 8, 13

- **IMPLEMENT**: (7) `removePlace`'s `aria-live` announcement gains a clause when the removed place
  carried the board's connections — a screen-reader user must not lose the connective structure
  silently; (8) the act-advance (`act.done`) handler moves focus to the next act's prompt heading,
  not just the scroll position — the module already uses `tabindex="-1"` for this; (13) rename
  inputs (`renderChip`, `renderPlace`) get a `maxlength` equal to `LABEL_MAX` (import it, don't
  re-declare the number).
- **PATTERN**: the module's existing announce/focus helpers — reuse, don't add a second mechanism.
- **GOTCHA**: `LABEL_MAX` is already exported and already enforced by the codec
  (`tooling/build-checks.mjs` imports it); the `maxlength` attribute is a *UI* echo of that cap, so
  it must be the same constant, not a literal. Keep the diff tight — every added line eats into the
  21-line headroom before the loc-summary runtime group flips (see the next task).
- **VALIDATE**: `node --check` both files; `node tooling/build-checks.mjs` → all 7 groups ✓;
  keyboard-only: advance an act → focus lands in the new act; remove the entry place → the live
  region says the connections went; paste 500 chars into a rename → capped at `LABEL_MAX`.
- **SATISFIES**: AC2

### UPDATE `system/loc-summary.json` — regenerate, then decide about approach

- **IMPLEMENT**: `git add` every file changed so far **by explicit path**, then
  `node agent-layer/gen-loc-summary.mjs`, then `git add system/loc-summary.json`.
- **GOTCHA (the whole point of this task)**: measured at planning time, the **unrounded** counts are
  `runtime 17,029` · `pages 4,995` · `generators 2,038` · `total 24,062`. The runtime group has only
  **21 lines of headroom** before it rounds to 17,100 — and `approach.html` renders the runtime
  number, so a flip churns **both approach baselines**. Read the regenerated file and compare:
  - runtime still `17000` → approach baselines are **out of scope**, do not touch them;
  - runtime now `17100` → approach baselines **must** be re-captured in Phase 4, and because the
    only visual delta is a few digits, `maxDiffPixels: 100` will swallow it — you must
    `rm tooling/visual-regression/baselines/approach-{neutral,saulera}.png` to force regeneration
    (memories: vr-update-skips-subperceptual, vr-tolerance-hides-text-changes).
  `tooling/build-journey.mjs` lands in `tooling/`, which **no group regex matches** — it cannot move
  any number. The generator reads `git show :<path>`, so an unstaged edit is invisible to it: stage
  first (memory: loc-summary-counts-tracked-only).
- **VALIDATE**: `node agent-layer/gen-loc-summary.mjs --check` → no drift; `node tooling/drift-check.mjs` → ✓.
- **SATISFIES**: AC3

### COMMIT the code

- **IMPLEMENT**: one atomic commit, message = what + doc reference, e.g.
  `feat(build): /build joins the IA — linked from home and work, and held to the gates (#138)`.
  Stage by explicit path.
- **VALIDATE**: `git show --stat` lists only this ticket's files; the 5 unrelated HTML files are
  still unstaged and still modified.
- **SATISFIES**: AC1, AC2, AC3

### UPDATE `tooling/visual-regression/visual.spec.mjs` — the new page + the truncation fix

- **IMPLEMENT**, three changes:
  1. **The `build` entry**, appended after `404` (before the two `proto` entries), using the five
     load-time `waitReady` handles and the single `waitVisible` handle from Patterns above. Add a
     comment in the established voice explaining why `[data-pattern-stage="ready"]` is `waitVisible`
     and not `waitReady`: `pattern-render.mjs:185` returns before setting the handle while the
     vocabulary is still loading, and `loadVocab()` is behind an `IntersectionObserver`
     (`rootMargin: 800px`) that cannot fire until the final resize reveals the page — put it in
     `waitReady` and the gate deadlocks to timeout.
  2. **The re-measure fix.** After the `waitVisible` wait, re-measure the document height and resize
     again if it changed, then capture. Guard it behind `if (p.waitVisible)` so the eight pages
     without a visible-activated beat keep a byte-identical flow and cannot churn. Comment it with
     what it fixes: the capture is viewport-sized, so a document that grows after the resize is
     **silently cut off** — the entire site footer has never been in `index-neutral.png` /
     `index-saulera.png`. Cite the planning measurements as evidence of the **class** of defect
     (index grew ~585 px, build ~257 px), explicitly **not** as expected dimensions: those numbers
     are macOS Chromium 149, and the pinned Linux container renders different absolute heights. A
     future reader must not read a different number as a regression.
  3. **The two stale comments**: this file's header says "Screenshots nine shipped pages" (→ ten,
     and the enumeration "the six IA pages, the /roundtrip deep viewer, and the two data-connected
     proto pages" needs /build); `.github/workflows/verify.yml:9-11` says "6 IA + 2 data-connected
     proto". Both are load-bearing documentation of what the gate covers.
- **GOTCHA**: `waitVisible` is read as a single selector (`page.locator(p.waitVisible).first()`) —
  one selector is enough here, so **do not** generalise it to an array. `waitReady` already accepts
  an array; use it.
- **GOTCHA (verified in planning)**: **do not** smoke-test this with a bare
  `npx playwright test --grep build` on macOS. Two reasons. (a) Playwright 1.61.1's default is
  `updateSnapshots: 'missing'` (confirmed in `node_modules/playwright/types/test.d.ts:1943` — "this
  is the default"), so that run **writes** macOS-rendered `build-neutral.png` / `build-saulera.png`
  into `baselines/` and *then* fails — one `git add` away from being committed as if it were the
  Docker capture. (b) The baselines are one platform-agnostic set rendered in the pinned Linux
  container, so any local macOS run fails on renderer differences, not regressions (memory:
  local-agent-visual-gate-notes). Syntax-check the spec instead (`node --check`), and let the
  capture step below be the first real run.
- **VALIDATE**: `node --check tooling/visual-regression/visual.spec.mjs`; then
  `git status --short tooling/visual-regression/baselines/` is **empty** — if anything was written,
  delete it before capturing. The "didn't touch the other eight pages" proof is structural (the fix
  is guarded by `if (p.waitVisible)`, and only `index` and `build` carry that key) and confirmed
  empirically by the baseline inventory in the next task, not by a local run.
- **SATISFIES**: AC4, AC5

### CAPTURE the baselines — from a clean worktree, never the dirty tree

- **IMPLEMENT**:
  ```bash
  git worktree add --detach ~/vr-138 HEAD          # under /Users — NOT /private/tmp (Docker sharing)
  cd ~/vr-138/tooling/visual-regression && npm run update:docker
  # copy back ONLY the intended PNGs, then:
  git worktree remove ~/vr-138
  ```
  Expected: **2 new** (`build-neutral.png`, `build-saulera.png`), **2 rewritten** for the index
  truncation fix + the close-card link, **2 rewritten** for work.html's third card, and **2 more**
  for approach **only if** the loc-summary runtime group flipped.
- **GOTCHA**: `update:docker` screenshots the **working tree** (memory: vr-gate-reads-working-tree).
  Running it in the main checkout would bake the 5 unrelated in-progress HTML copy edits into the
  baselines — and `roundtrip.html` and `index.html` are both in `PAGES`, so two baselines would
  silently absorb another session's unfinished work under a 100-px tolerance that would never flag
  it. The detached worktree at your commit is the only correct capture surface.
- **VALIDATE**: `git status --short tooling/visual-regression/baselines/` lists **exactly** the
  expected PNGs and nothing else. Then re-run the gate **in the same image** (never bare
  `npx playwright test` — that compares Linux baselines against a macOS renderer):
  ```bash
  cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work \
    -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy \
    sh -c 'npm ci && npx playwright test'          # → 20/20
  ```
  Eyeball `build-neutral.png` and `index-neutral.png`: the site footer must now be visible at the
  bottom of both. CI's `visual` job (`gh pr checks`) is the authoritative verdict.
- **SATISFIES**: AC5

### COMMIT the baselines separately

- **IMPLEMENT**: `chore(visual): /build baselines, and the capture that stopped truncating (#138)` —
  matching the repo's existing `chore(visual):` commits (`02beb02`, `754bdb9`). The message states
  which baselines moved and why, including the footer that was never captured.
- **VALIDATE**: `git show --stat` lists only PNGs.
- **SATISFIES**: AC5

### CREATE `tooling/build-journey.mjs` — the cross-engine gate

- **IMPLEMENT**: seed from the preserved #137 script (path in "New Files to Create"), then:
  - **Header** in `tooling/build-checks.mjs`'s voice: what it drives, why it is committed, that
    Playwright is **not** a repo dependency and is resolved out of
    `tooling/visual-regression/node_modules` (1.61.1, the pinned CI version), and the run line:
    `node tooling/visual-regression/serve.mjs & node tooling/build-journey.mjs [chromium|firefox|webkit|all]`.
  - **Launcher**: the `createRequire` form from Patterns; engine from `process.argv[2]` (default
    `all`); `BASE = http://127.0.0.1:4757`; per-engine header line + per-engine pass/fail summary;
    `exit 1` if any engine fails any assertion or logs a page error.
  - **Keep all 43 existing assertions**, then add the ticket's edge battery:
    | edge | assertion |
    | --- | --- |
    | skip-import path | derive-a-palette route re-skins the stage with no file at all |
    | accept-all-defaults speedrun | defaults → a rendered pattern in **≤ 60 s** (assert elapsed ms) |
    | "dealer" verdict | the answer pair that lands on `dealer` renders the matrix copy verbatim |
    | breadboard emptied | remove every place → honest empty state, **no** pattern rendered, keep rail hides |
    | 33 MB refusal | a 33 MB `.json` is refused client-side against `MAX_EXPORT_BYTES`'s real message |
    | reduced-motion | `newContext({ reducedMotion: 'reduce' })` → full journey still completes |
    | dock mid-flow | open `#appearance` mid-build → build state **and** `?b=` both survive (`dock.mjs:443-447`) |
    | the links in | `/` and `/work` each carry a resolving `a[href="/build"]` |
- **GOTCHA**: WebKit and Firefox differ from Chromium on clipboard permissions, `CompressionStream`
  availability, and download interception — where an engine genuinely cannot do a thing, assert the
  **documented fallback** rather than skipping the assertion silently (memory: the-check-that-cannot-fail).
  Log every skip. The 33 MB fixture must be generated at runtime into a temp path and deleted, never
  committed.
- **VALIDATE**: `node tooling/build-journey.mjs all` → every engine green, zero page errors. Run it
  **three consecutive times per engine** and record the counts in the report; any flake is a finding,
  not noise.
- **SATISFIES**: AC6

### RUN the keyboard-only a11y pass

- **IMPLEMENT**: walk /build with the keyboard only — Tab order through Act 0 → both wizards → the
  breadboard's four edit verbs → the pattern stage → the keep rail; confirm every editable is a real
  control, every `aria-live` region announces the change that happened, focus is never lost or
  trapped, and the breadboard's keyboard model matches the APG conventions cited above. Record
  findings in the report; fix anything that is a defect on the newly-linked page, and file anything
  larger rather than growing this slice.
- **VALIDATE**: written walk-through in the report, naming what was checked and what was found —
  including negative results.
- **SATISFIES**: AC2

### UPDATE `CLAUDE.md` — the architecture map

- **IMPLEMENT**: the map currently has **no entry** for /build or any of its modules. Add, in the
  established one-line-per-module voice:
  - under the shipped-pages line: `build.html` — the sixth public surface, off-nav but linked from
    the home close beat and the work proof index, `noindex`;
  - under `system/`: `build-import.mjs`, `build-questions.mjs`, `breadboard.mjs`, `pattern-rules.mjs`,
    `pattern-render.mjs`, `build-card.mjs`, `build-share.mjs`, `build-keep.mjs` — each with its
    governing ticket;
  - the three modules #133 shipped and never mapped: `pack-import.mjs`, `brand-import.mjs`,
    `pack-imported.mjs`;
  - under `tooling/`: `build-checks.mjs` (the committed unit gate, registered in CI) and
    `build-journey.mjs` (the cross-engine driver, operator-run).
  - **"Where new code goes"**: a line for a new /build pattern pointing at `pattern-rules.mjs` +
    `pattern-render.mjs` and the spec-first rule.
- **GOTCHA**: the three #133 modules are strictly speaking another ticket's documentation debt.
  Included deliberately — they are the same public surface, the map is read as authoritative by every
  session, and splitting them out would mean two PRs editing the same block. Say so in the report.
- **VALIDATE**: `grep -c "build" CLAUDE.md` > 0; a fresh read of the map explains /build without
  opening any other file.
- **SATISFIES**: AC7

### WRITE the artifacts and open the PR

- **IMPLEMENT**: `.claude/reports/build-links-in-and-gates-report.md` (what was done, divergences,
  the loc-summary decision and why, the three-engine run counts, the a11y findings, the baseline
  inventory) and `.claude/code-reviews/pr-<N>-review.md` after the review runs. PR body **must**
  carry a `Closes #138` trailer — a title mentioning `(#138)` closes nothing (memory:
  prs-dont-auto-close-tickets; #78 cost a wasted planning pass).
- **VALIDATE**: `gh pr view --json body | grep -c "Closes #138"` → 1; `gh pr checks` → `verify` and
  `visual` both green.
- **SATISFIES**: AC8

---

## TESTING STRATEGY

No suite exists (CLAUDE.md). "Done" = run the surface you touched, plus the committed gates.

### Unit / committed gates

- `node tooling/build-checks.mjs` — the 7-group pure chain; must stay green through the #144 fixes
  (finding 13 touches `LABEL_MAX`, which the codec battery already covers).
- `node tooling/drift-check.mjs` · `node tooling/token-lint.mjs` · `node agent-layer/gen-loc-summary.mjs --check`.

### Integration

- `node tooling/build-journey.mjs all` — the full journey ×3 engines, ×3 consecutive runs each.
  Engine-portable by construction; runs anywhere.
- The visual gate — **in the pinned container only** (see Level 5), 20/20, from a clean tree.
  A bare local `npx playwright test` on macOS is meaningless here: one platform-agnostic baseline
  set, rendered on Linux.

### Edge cases (each an assertion in the journey)

Skip-import · accept-all-defaults ≤ 60 s · "dealer" verdict copy · breadboard emptied to zero places ·
33 MB client refusal · reduced-motion full pass · dock opened mid-flow preserving state **and** `?b=` ·
JS-off (the close-card link and the work card are static markup, so both must still work).

### Manual

Keyboard-only walk of /build (above). Eyeball /work at 1280 and 640. Eyeball the new
`build-*.png` and `index-*.png` baselines for the footer.

---

## VALIDATION COMMANDS

Run every one; zero regressions.

### Level 1 — syntax & style
```bash
node --check system/breadboard.mjs && node --check system/build-questions.mjs && node --check tooling/build-journey.mjs
node tooling/token-lint.mjs
```

### Level 2 — unit
```bash
node tooling/build-checks.mjs          # 7 groups ✓
```

### Level 3 — artifacts
```bash
node tooling/drift-check.mjs
node agent-layer/gen-loc-summary.mjs --check
```

### Level 4 — functional
```bash
node tooling/visual-regression/serve.mjs &      # PORT=4757, repo root
node tooling/build-journey.mjs all              # chromium + firefox + webkit
```

### Level 5 — pixels (container only — the baselines are Linux-rendered)
```bash
cd tooling/visual-regression && docker run --rm -v "$PWD/../..":/work \
  -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy \
  sh -c 'npm ci && npx playwright test'                  # 20/20
gh pr checks                                             # verify ✓ + visual ✓ — the authority
```

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** /build is reachable from the shipped IA: a static action in the home close card and a
      third "Runs now" exhibit on work.html, both working with JavaScript off; build.html's head
      comment no longer claims it is unlinked. *(epic AC9)*
- [ ] **AC2** The keyboard-only journey through /build completes with no lost or trapped focus, every
      edit announced; #144 findings 7, 8 and 13 are fixed on `breadboard.mjs` / `build-questions.mjs`.
- [ ] **AC3** `system/loc-summary.json` is regenerated from the staged index and `--check` is clean;
      whether the approach baselines are in scope is **decided from the measured runtime number**, not
      assumed.
- [ ] **AC4** `visual.spec.mjs` covers /build under neutral + saulera (10 pages / 20 PNGs), using the
      five load-time handles as `waitReady` and `[data-pattern-stage="ready"]` as `waitVisible`; the
      spec header and `verify.yml`'s comment both state the true coverage.
- [ ] **AC5** The capture no longer truncates: index and build baselines contain the whole document
      including the site footer; baselines were captured from a **clean detached worktree**; exactly
      the intended PNGs changed; the gate is 20/20 **in the pinned container** and `visual` is green
      on CI.
- [ ] **AC6** `tooling/build-journey.mjs` is committed, runs on chromium + firefox + webkit, keeps
      #137's 43 assertions, adds the eight edge cases, and passes three consecutive runs per engine.
- [ ] **AC7** CLAUDE.md's architecture map documents build.html, all eight /build modules, the three
      #133 pack-import modules, and both tooling gates.
- [ ] **AC8** Plan, report and review are committed in the PR; the PR body carries `Closes #138`;
      `verify` and `visual` are both green on CI.

---

## COMPLETION CHECKLIST

- [ ] Branched from `origin/main`; the 5 unrelated working-tree HTML edits untouched and unstaged
- [ ] Links in and proven with JS off
- [ ] #144 items 7, 8, 13 fixed; `build-checks` still 7/7
- [ ] loc-summary regenerated **after staging**; approach-baseline scope decided from the number
- [ ] Spec updated (entry + re-measure fix + both stale comments); baselines captured from a clean worktree
- [ ] Only the intended PNGs moved; 20/20 green **in the container**; footer visible in index and
      build baselines; nothing macOS-rendered ever reached `baselines/`
- [ ] Journey green ×3 engines ×3 runs; keyboard walk written up
- [ ] CLAUDE.md map updated
- [ ] Plan + report + review committed; PR body carries `Closes #138`; CI green
- [ ] Follow-up issue filed for the deferred nav/footer entry

---

## OPEN QUESTIONS / ASSUMPTIONS

- **Decided with the owner (2026-07-27)**: #138 absorbs **only** #144 items 7, 8, 13 — the a11y and
  share-serialisation findings the pass surfaces anyway. Items 9, 10, 12 stay on #144, which stays
  open. The journey is **committed + run locally**, not registered in CI.
- **Decided in this plan (say so in the PR, don't re-litigate)**:
  - The link is **static markup**; `close.mjs` is not touched. JS-off degradation + no snapshot to
    go stale.
  - /build goes in work.html's "Run it" grid (a demo you drive), not the "More proof" row-list
    (evidence you read); `grid-2` → `grid-3` with the heading and lead re-counted.
  - The nav/footer entry is **deferred** — one footer item churns all 20 baselines.
- **A1**: the VR gate's `waitVisible`/re-measure design is not assumed — it was **measured in
  planning** (see NOTES). If the implementation finds different numbers, the numbers win.
- **A2**: `runtime` is at 17,029/17,050. Whether the two approach baselines are in scope is genuinely
  unknown until the #144 fixes are written. Both branches are planned for; neither is guessed.
- **Q1 — the re-measure fix's blast radius.** It is guarded behind `if (p.waitVisible)`, so only
  index and build can move. If review would rather see the gate fix land as its own ticket, the
  counter-argument is cost: index is being re-captured here anyway, so deferring means capturing
  index's baselines **twice**. Flag, don't silently split.
- **Q2 — should `/build` fire an analytics virtual-route pageview** the way the peak fires
  `/factory/built`? Deliberately not in this slice; it is a measurement decision, not an
  integration one. Worth an issue.

---

## NOTES (open canvas)

### The gate defect, measured

Three probes were run in planning against the real pages, through the VR dir's Playwright 1.61.1
(the pinned CI version), reproducing `visual.spec.mjs`'s flow exactly.

**Probe 1 — is the `waitVisible` design right?**

```
pattern-stage ready at load: no          ← confirms it CANNOT be waitReady
waitReady [data-build-import="ready"]  ✓ 2ms      (all five settle at load)
wizard mounts ready: 2
waitVisible [data-pattern-stage="ready"] ✓ 79ms after the resize
metric-tiles on the stage: 3             ← the vocabulary really landed
rest==final: STABLE ✓ · zero page errors ✓
height stable: NO ✗  7179 → 7436         ← the finding
```

**Probe 2 — how far does that reach?**

```
index  measured=7232  settled=7817   TRUNCATES 585px
work   measured=6547  settled=6547   OK
build  measured=7179  settled=7436   TRUNCATES 257px
```

The spec measures the document height, resizes the viewport to it, *then* waits for the
visible-activated beat. `toHaveScreenshot` without `fullPage` captures the **viewport**. So anything
the beat adds after the resize falls outside the frame. On index that is 585 px:

```
captured frame = 0..7232px   document = 7817px
  close   5446..6431  in frame          ← good: #138's new link WILL show in the diff
  footer  7360..7817  ENTIRELY BELOW THE CAPTURED FRAME
```

The site footer has never been in the index baselines. It arrived with #105's `waitVisible` (the peak
assembling below the fold), and nothing caught it because a baseline that is *shorter* than the page
still compares cleanly against itself — **the check skipped the thing it tested** (memory:
check-that-cannot-fail), and `maxDiffPixels: 100` would not have flagged it even if it hadn't.

**Probe 3 — does the fix hold?** Re-measure after `waitVisible`, resize again if it moved:

```
index  viewport=7817  doc=7817  whole page in frame ✓  footer captured ✓  two-stable-shots: STABLE ✓
build  viewport=7436  doc=7436  whole page in frame ✓  footer captured ✓  two-stable-shots: STABLE ✓
```

Three lines, guarded behind `if (p.waitVisible)` so the other eight pages keep a byte-identical flow.

**Calibrating what these probes do and don't prove.** They ran on macOS Chromium 149; the pinned
Linux container renders different absolute heights, so the numbers are evidence of the *class* of
defect, never expected dimensions. The probes also set `reducedMotion: 'reduce'` on the context,
which memory `vr-gate-captures-no-preference` records as a no-op in this gate's actual capture path
— so they are **not** proof of motion-condition parity. The finding survives that caveat intact:
the growth is content assembly (the peak's skeleton→content swap, the pattern stage's post-fetch
render), not motion.

### Why the link is markup

`close.mjs`'s own header promises the close card "stands on its own as a complete close" with JS off.
An appended `<a>` breaks that promise for the one action that is the epic's entire thesis. It also
makes the ticket's warning moot rather than obeyed: there is no state to snapshot, so there is no
one-shot-snapshot bug to avoid. Considered and rejected: carrying the visitor's derived brand into
/build via a query param — /build's `?b=` is a whole build, home's is `?brand=`, and bridging the two
codecs is a feature, not a link.

### Ordering, and why it is not negotiable

`gen-loc-summary.mjs` reads `git show :<path>` — the **index**. Regenerate before staging and you get
a confident, wrong "no drift" that CI's `verify` job then catches (memory:
loc-summary-counts-tracked-only). And `update:docker` screenshots the **working tree**, which
currently holds another session's five in-progress HTML copy edits — two of them
(`index.html`, `roundtrip.html`) on VR-covered pages. Capturing from the main checkout would bake
unfinished work into two committed baselines under a tolerance that would never report it. Hence:
stage → regen → commit code → capture from a clean detached worktree under `/Users` → commit
baselines separately.

### Risk register

1. **The `?b=` / dock interaction across engines** — `dock.mjs` carries `location.search` through
   `pushState`; WebKit's history behaviour is the most likely place that assumption breaks. It is an
   explicit journey assertion, not an assumption.
2. **Journey flake on the async vocabulary fetch** — the pattern stage waits on a real
   `fetch('/handoff/verdant/vocabulary.json')`. Three consecutive runs per engine before calling it
   green; a flake gets diagnosed, not retried away.
3. **The approach-baseline coin flip** — 21 lines of headroom. If it flips, the visual delta is a few
   digits, which `maxDiffPixels: 100` swallows: `rm` the PNGs to force regeneration (memory:
   vr-update-skips-subperceptual).
4. **CI's approach `countUp` flake** — a red `approach · <pack>` on CI with a green local Docker run
   is the known rAF-vs-retries:0 flake, not a regression (memory: vr-gate-approach-countup-flake).
   Check which pack failed; a real regression fails the same one every time.

### Appetite

Small batch. If a circuit breaker is needed, cut in this order: (1) the journey's edge battery down
to the ticket's named eight, (2) the #144 fixes back onto #144. **Never** cut the links (the ticket's
reason to exist), the /build baselines, or the truncation fix — a gate that silently ignores the
bottom of the page is worse than no gate.

## AMENDMENTS

- (none yet — created 2026-07-27)
