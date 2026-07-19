# Feature: Factory shell + cheap stations (ticket 10.1)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

> **First slice of GitHub issue #10** (Factory page). #10 is ~900–1500 lines across 9 tasks; this
> slice is the ~300–450-line **structural shell** that stands up the five-station, deep-linkable
> layout with honest capability badges, embeds the two prototypes, and links the handoff pack —
> deferring every expensive interaction (intake wizard · live re-skin · trace player · scenario
> toggle · ethics gate) to later 10.x slices.
>
> **STATUS: execution-ready (2026-07-18).** All risks retired empirically — see the AMENDMENTS log.
> Docker verified running (baseline regen works); iframe heights measured (not guessed); the two
> open questions decided. No open questions remain that block one-pass execution.

## Feature Description

Replace the honest `factory.html` **stub** with the real five-station pipeline layout — the flagship,
deep-linkable Factory page. In this slice the two *cheap* stations become fully live (Prototypes =
embedded data-connected screens; Handoff = the pack viewer + download), while the three *expensive*
stations (Intake, Design-system generation, Agents-visible) render as designed sections carrying an
honest **"In build"** capability badge and a pointer to whatever raw surface already runs today.
Deep links resolve so the page can be linked station-by-station. No new view-time JavaScript, no new
tokens, no generator regeneration — pure HTML/CSS on the existing vanilla shell.

## User Story

As a **hiring manager / technical reader** landing on `/factory` (or a deep link like
`/factory#prototypes`),
I want to **see the pipeline's shape — five stations, with the ones that already run doing so in
front of me and the rest honestly labeled "in build"**,
So that **I can start verifying the claim now and return as each station lands, without ever being
shown something faked as working**.

## Problem Statement

`factory.html` today is a route-reserving stub: a hero plus two lists ("What runs today" / "What's
plan-gated", the latter five `In build` badges). It does not perform the pipeline, embeds nothing,
and links nothing. The full Factory page (#10) is large and gated on the derivation-engine wizard,
the live re-skin, and a recorded generation trace. We need the **shell and the cheap stations first**
so the page stops being a stub, the two already-built exhibits (prototypes, handoff pack) become
reachable *from the flagship page*, and the remaining stations have honest homes to be filled into.

## Solution Statement

Rewrite `factory.html`'s `<body>` into **five `<section id>` stations** on the existing shipped-page
shell (three token layers → `portfolio.css` → `client.neutral.config.js` → `site.js` → `portfolio.js`
→ `analytics.mjs`). Reuse existing organisms (`.page-hero`, `.section`, `.section-label`, `.lineup`,
`.card`, `.capability`, `.btn`) and add only page-specific layout in a **page-scoped `<style>` block
reading tokens alone** (the sanctioned pattern set by the merged `handoff.html`). Deep links are pure
anchors + `scroll-margin-top` (the Approach-page idiom) — no router. Stations 3 & 4 wire the real,
already-shipped surfaces; stations 1/2/5 carry `.capability` "In build" badges plus an honest link to
the raw surface each will eventually replace. Prototypes embed via **iframe** (preserving each proto's
own data-loading + source-honesty). The visual-regression gate is updated to **mask** the two iframes
(zero coverage loss — the protos are already screenshotted standalone) and the factory baselines are
regenerated.

## Out of Scope / Non-Goals

This slice is **the shell + the two cheap stations only**. Everything below is a *later* 10.x slice —
do not build it here, and do not let a station's "In build" copy imply it:

- **Not included: Station 1 intake guided wizard** (the `derive()`-input questions) — defer to 10.2.
- **Not included: Station 2 live re-skin moment** (`derive()` + one-line token-pack swap) — defer to 10.2/10.3. (The engine already runs raw at `/derive`; Station 2 *links* it, does not embed it.)
- **Not included: Station 5 trace player mounted on the station**, nor recording a real generation-pipeline trace — defer. (The raw player already runs at `/trace`; Station 5 *links* it.)
- **Not included: the scenario toggle** (Verdant ⇄ Fieldwork swapping all five stations) — defer. This slice shows **both** protos, not a toggle.
- **Not included: the ethics guess-then-reveal (Manipulation Matrix)** — defer.
- **Not included: the `trackFactoryDriven()` analytics event.** It fires when the reader *drives* the pipeline; there is nothing to drive in this slice. Keep `analytics.mjs` loaded for the standard pageview only (as every page does), add **no** `trackFactoryDriven()` call.
- **Not changing:** `system/components.css`, `system/portfolio.css`, `system/tokens.source.json` (no new token), any generator, the nav config (Factory is already listed), or the two proto pages (`proto/verdant.html`, `proto/fieldwork.html` — embedded as-is).
- **Not doing the voice-contract copy pass (7.5).** Copy must be honest-to-state, but polished-voice is deferred until both exhibits are live. Do not gold-plate prose here.

## Feature Metadata

**Feature Type**: Enhancement (stub → real shell) · New Capability (first live Factory stations)
**Estimated Complexity**: Low–Medium (one substantial HTML file + a 3-line CI-spec change + baseline regen)
**Primary Systems Affected**: `factory.html` (shipped page) · `tooling/visual-regression/` (CI gate)
**Dependencies**: none new. Consumes already-shipped surfaces: `proto/verdant.html`, `proto/fieldwork.html` (#8), `handoff.html` + `handoff/verdant/pack.bundle.json` (#14). All on **`main`**.

## Related Work

**Implements**: ticket **10.1** — first slice of GitHub issue **#10** (Factory page) · **Epic**: #1
(`docs/epics/ai-first-ux-factory.architecture.md` §IA line 62, §Missing pieces line 66).

**Back-references**:

- `.claude/plans/site-shell-ia-analytics.md` — Why: established the shipped-page shell + the `factory.html` stub + the `.capability` badge idiom this slice reorganizes.
- `.claude/plans/handoff-pack-viewer.md` — Why: built `/handoff` + `pack.bundle.json`, the Station-4 targets (only on `main`).
- `.claude/plans/data-connected-prototypes.md` — Why: built the two proto pages this slice embeds.
- `.claude/plans/visual-regression-gate.md` — Why: the CI gate (gate 3/3) this change must keep green; factory is one of its 8 screenshotted pages.

**Forward-references** (append as follow-ups get created):

- 10.2 — Station 1 intake wizard + Station 2 live re-skin (the derivation-engine slice).
- (later) trace station · scenario toggle · ethics gate.

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

> **BASE BRANCH = `main`.** This plan was authored on the stale `feature/visual-regression-gate`
> branch. `handoff.html`, `system/handoff-viewer.mjs`, and `handoff/verdant/pack.bundle.json` exist
> **only on `main`** (merged via PR #34/#35). Branch fresh from `origin/main` (see Task 0). Every
> other file this plan touches is byte-identical across the two branches (verified via `git diff`).

- `factory.html` (whole file, 124 lines) — Why: the stub to fully rewrite. Keep `<head>` (title,
  `<meta name="robots" content="noindex">`, the three token layers + `portfolio.css`) and the four
  chrome `<script>`s at the bottom; replace the `<body>` content. Note its existing five `In build`
  badges and its "What runs today" links (`/derive`, `/system/tokens.contract.css`) — these get
  reorganized into the stations, not deleted.
- `index.html` (lines 43–84) — Why: the canonical `.section` + `.section-label` (`.num`/`.line`) +
  `.card`/`.card-body`/`.card-kicker`/`.card-foot` pattern AND the live badge idiom:
  `<span class="capability live">Runs now</span>` vs `<span class="capability">In build</span>`.
  Mirror these exactly.
- `proto/verdant.html` + `proto/fieldwork.html` (whole files) — Why: the pages to **iframe** at
  Station 3. Confirm: root-absolute asset paths (`/system/…`, `/scenarios/…`) so they load under any
  host; each owns its `loadCollection()` Worker→static fallback and renders its own `.proto-source`
  indicator; Fieldwork's two `data-slot` regions are already honest-empty placeholders. **Do not lift
  their markup — embed the pages.**
- `handoff.html` (on `main`; head + first ~45 lines) — Why: Station-4 link target. Route `/handoff`,
  title "ux factory · handoff pack". Read to confirm it renders standalone (it does — same shell).
- `system/portfolio.css` (lines 104–122 `.lineup`; 391–412 `.capability`/`.capability.live`;
  449–450 the deep-link `scroll-margin-top:90px` idiom; 143–170 `.cs-h`/`.cs-jump` jump-chip nav) —
  Why: every layout primitive this slice reuses. **`.capability` and its `.live` modifier already
  exist — do not redefine them.** The `.cs-jump a` chip strip is the station-nav idiom to reuse.
- `tooling/visual-regression/visual.spec.mjs` (lines 15–24 `PAGES`, 39–80 the test body) — Why: the
  one CI-gate edit. `factory` is entry `kind:'ia'` (line 18). Add a `mask` field + thread it into the
  single `toHaveScreenshot` call (loop wraps both packs around it — one edit covers neutral+saulera).
- `tooling/visual-regression/package.json` (line 8) — Why: `npm run update:docker` = the ONLY correct
  baseline-regen command (Linux PNGs via `mcr.microsoft.com/playwright`). A local
  `--update-snapshots` makes macOS PNGs that fail CI.
- `tooling/token-lint.mjs` (lines 33–76) — Why: proof the page-scoped `<style>` is safe. UNDECLARED
  scans `components.css` only; ORPHAN's consumer set includes `htmlFiles(".")` so `factory.html`'s
  inline var() refs only reduce orphans. HTML `<style>` literals are never linted.
- `system/client.neutral.config.js` (lines 22–29) — Why: confirms `Factory` is already a nav item
  (`key:"factory"`); `<body data-page="factory">` makes `site.js` mark it active. No chrome change.

### New Files to Create

- **None.** This slice edits `factory.html` + `visual.spec.mjs` and regenerates two baseline PNGs.
  No new ES module, no new CSS file, no new token.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- Playwright `toHaveScreenshot` masking — https://playwright.dev/docs/test-snapshots#masking
  - Section: the `mask` option (array of `Locator`s painted as a solid box).
  - Why: masks the two embed iframes so the factory baseline is deterministic regardless of iframe
    load state. The `<iframe>` element is in the DOM before its content loads, so a mask over it is
    stable — which is why masking beats waiting for the frames.
- Iframe `loading="lazy"` + `title` (a11y) — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
  - Why: `title` is required for the iframe to be an accessible named region; `loading="lazy"` is a
    perf nicety safe here because the outer box height is CSS-fixed (no layout shift on load).

### Patterns to Follow

**Capability badge (honesty surface #3) — reuse verbatim (`index.html`, `portfolio.css:391`):**

```html
<!-- live station -->
<h3 class="lineup-title">Prototypes <span class="capability live">Runs now</span></h3>
<!-- deferred station -->
<h3 class="lineup-title">Intake <span class="capability">In build</span></h3>
```

Text carries the state; `.live` only recolors (contrast note in `portfolio.css:392` — never color-only).

**Deep-linked section landing below the sticky header (`portfolio.css:449–450`, Approach page):**

```css
/* in factory.html's page-scoped <style> — structural literal, same idiom as .cs-h */
#intake, #generation, #prototypes, #handoff, #agents { scroll-margin-top: 90px; }
```

**Page-scoped `<style>` reading tokens alone (the merged `handoff.html` precedent):**

```html
<style>
  /* Factory-shell layout — page-unique, styled from tokens alone (colour/space/radius/type via
     var(--…)); grid / %/ fixed heights are inherently structural literals. #10 later slices restyle
     these on the station. Not promoted to components.css: single-page layout, not a reused organism. */
  .factory-embed {
    width: 100%; border: 1px solid var(--color-border); border-radius: var(--radius-md);
    background: var(--color-bg-surface); display: block;
  }
</style>
```

**Iframe embed — preserve the proto's own honesty surface (Station 3):**

```html
<iframe class="factory-embed factory-embed-phone"
        src="/proto/verdant.html"
        title="Verdant — data-connected prototype (renders from the mock API, degrades to static fixtures)"
        loading="lazy"></iframe>
<p class="muted"><a href="/proto/verdant.html">Open Verdant in its own tab →</a></p>
```

**Honest "raw surface runs today" pointer on a deferred station (mirrors the current stub):**

```html
<p>The designed staged surface is in build. The engine itself already runs —
   <a href="/derive">see the raw derivation harness →</a></p>
```

---

## IMPLEMENTATION PLAN

Phases run top to bottom. Phase 1 (branch) gates everything. Phases 2 (page) and 3 (CI-gate spec) are
**independent** of each other and could be authored in either order; Phase 4 (baseline regen) **depends
on both** Phase 2 and Phase 3 being final, because it screenshots the new page through the edited spec.

### Phase 1: Foundation — correct base branch

**Tasks:**

- Branch fresh from `origin/main` (NOT the current stale branch). This is where the Station-4 targets exist.
- Confirm `<body data-page="factory">` will pick up the existing Factory nav item.

### Phase 2: Core Implementation — rewrite `factory.html`

**Depends on:** Phase 1.

**Tasks:**

- Rewrite `<body>` as five `<section id>` stations on the existing shell.
- Add the page-scoped `<style>` (deep-link `scroll-margin-top`, `.factory-embed` frames, station-nav chips).
- Add the station-nav chip strip (deep links).
- Wire Station 3 iframes (verdant + fieldwork) and Station 4 handoff link + download.
- Set honest capability badges: Prototypes + Handoff = `.capability live`; Intake, Generation, Agents = `.capability`.

### Phase 3: Integration — keep the visual-regression gate green

**Independent of:** Phase 2 (can be edited before or after the page; both must be final before Phase 4).

**Tasks:**

- Add `mask: 'iframe.factory-embed'` to the `factory` entry in `PAGES` and thread it into `toHaveScreenshot`.

### Phase 4: Testing & Validation

**Depends on:** Phases 2 **and** 3 (both final).

**Tasks:**

- Regenerate the two factory baselines via Docker.
- Run token-lint + drift-check + the full visual-regression suite locally; manual-verify the page.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 0 — SETUP: branch from `main`, clean stray file

- **IMPLEMENT**: `git fetch origin`; branch fresh from `origin/main`:
  `git checkout -b feature/factory-shell origin/main`. Delete the stray untracked `--full-page` file
  at repo root (`rm -- ./--full-page`) so it doesn't ride along. (Untracked review/plan `.md`s under
  `.claude/` travel with the checkout — harmless, leave them.)
- **PATTERN**: base-branch discipline — `handoff.html`/`pack.bundle.json` are main-only.
- **GOTCHA**: Do **not** branch from `feature/visual-regression-gate` — `handoff.html` is absent there
  and Station 4 would have no target. Verify after checkout: `ls handoff.html handoff/verdant/pack.bundle.json`
  must both exist.
- **VALIDATE**: `git rev-parse --abbrev-ref HEAD` → `feature/factory-shell`; `test -f handoff.html && test -f handoff/verdant/pack.bundle.json && echo OK`.
- **SATISFIES**: precondition for AC5 (handoff targets exist).

### Task 1 — UPDATE `factory.html`: keep the head + chrome, rewrite the body

- **IMPLEMENT**: Leave `<head>` intact (title `The factory · Linards Berzins`, `noindex`, the four
  stylesheet links) and the four bottom `<script>`s intact (`client.neutral.config.js`, `site.js`,
  `portfolio.js`, `analytics.mjs` module). Replace everything between `<body data-page="factory">` and
  the scripts. Update the header comment to cite ticket **10.1** (slice of #10): "the five-station
  shell — Prototypes + Handoff live; Intake/Generation/Agents in build".
- **PATTERN**: shell = `index.html:18` (`<body data-page=…>`) + scripts `index.html:103–106`.
- **IMPORTS**: none (no new module).
- **GOTCHA**: keep `analytics.mjs` as the standard pageview only — do **not** import/call
  `trackFactoryDriven` (nothing to drive this slice; see Out of Scope).
- **VALIDATE**: `grep -c 'trackFactoryDriven' factory.html` → `0`; `grep -c 'data-page="factory"' factory.html` → `1`.
- **SATISFIES**: AC1.

### Task 2 — ADD the page-scoped `<style>` block (tokens only)

- **IMPLEMENT**: In `<head>` after the four stylesheet links (mirroring `handoff.html`'s in-head
  `<style>`), add a `<style>` with, at minimum: `#intake,#generation,#prototypes,#handoff,#agents { scroll-margin-top: 90px; }`;
  `.factory-embed` (width:100%, `1px solid var(--color-border)`, `var(--radius-md)`, `background:var(--color-bg-surface)`, `display:block`);
  **measured fixed heights** (see AMENDMENTS — rendered heights measured via Playwright, rounded up so
  nothing clips at any width): `.factory-embed-phone { height: 1280px; }` (Verdant: content
  1218–1252px, phone pinned at its 800px cap) and `.factory-embed-board { height: 1920px; }`
  (Fieldwork desktop: 1830–1880px), plus `@media (max-width: 640px) { .factory-embed-board { height: 2160px; } }`
  (Fieldwork stacks to ~2087px on narrow widths). Open with the justifying comment (colour/space/radius/type
  via `var(--…)`; grid/%/fixed-height are structural literals; single-page → not promoted to components.css).
- **PATTERN**: `handoff.html`'s in-head `<style>` with the identical justifying comment.
- **GOTCHA**: **fixed iframe height is mandatory** — `dvh`/`%` inside an iframe resolves against the
  iframe's *own* box, and an auto-height iframe would make the page's total height (and thus the
  visual-regression capture) nondeterministic. Fixed outer height = deterministic layout; the mask
  (Task 7) handles inner-content paint. Use only declared tokens for colour/space/radius (all exist:
  `--color-border`, `--radius-md`, `--color-bg-surface`, spacing tokens).
- **VALIDATE**: after Task 8, `node tooling/token-lint.mjs` → `✓ … 0 undeclared · 0 orphan`.
- **SATISFIES**: AC3, AC4.

### Task 3 — ADD the hero + station-nav chip strip (deep links)

- **IMPLEMENT**: Keep a `.page-hero` (reuse the stub's honest framing — the factory "performs the
  pipeline; everything states what runs today"). Below it add a `.cs-jump`-style chip strip: five
  `<a>` chips → `#intake #generation #prototypes #handoff #agents`, labeled by station.
- **PATTERN**: `.cs-jump` nav (`portfolio.css:153–170`); hero `.page-hero`/`.hero-eyebrow`/`.hero-sub` (stub lines 24–39).
- **GOTCHA**: chips are plain anchors — no JS. External `/factory#prototypes` resolves natively via the ids.
- **VALIDATE**: manual — clicking each chip scrolls to its station clearing the sticky header (90px margin).
- **SATISFIES**: AC3.

### Task 4 — ADD Stations 1, 2, 5 (deferred) with honest "In build" badges + raw-surface pointers

- **IMPLEMENT**: Three `<section class="section" id="…">` blocks using `.section-label`
  (`01 Intake` … `05 Agents visible`) + `.lineup`/`.card`:
  - **`#intake` — Intake `<span class="capability">In build</span>`**: describe the guided wizard (one
    decision at a time, recommended default + reasoning, bounded overrides). No interactive control.
  - **`#generation` — Design-system generation `<span class="capability">In build</span>`**: describe
    the staged worked example + the one live re-skin moment; honest pointer: the engine already runs
    raw — link `/derive` ("the raw derivation harness") and `/system/tokens.contract.css` ("the token
    contract this re-skins"). (Reuses the stub's two "what runs today" links.)
  - **`#agents` — Agents visible `<span class="capability">In build</span>`**: describe replayed,
    curated PIV-act traces; honest pointer: link `/trace` ("watch a raw replay").
- **PATTERN**: stub's "What's plan-gated" list (lines 65–106) reorganized per-station; `.capability` badge from `index.html:49`.
- **GOTCHA**: copy honest-to-state, **not** voice-final (7.5 deferred). Do not imply the wizard/re-skin
  runs here. "In build" is literally true.
- **VALIDATE**: `grep -c 'class="capability"' factory.html` → `3` (the three deferred stations).
- **SATISFIES**: AC2.

### Task 5 — ADD Station 3 (Prototypes) — embed both protos via iframe, `Runs now`

- **IMPLEMENT**: `<section class="section" id="prototypes">`, `.section-label` `03 Prototypes
  <span class="capability live">Runs now</span>`. Two `.factory-embed` iframes:
  `src="/proto/verdant.html"` (`.factory-embed-phone`) and `src="/proto/fieldwork.html"`
  (`.factory-embed-board`), each with a descriptive `title` and `loading="lazy"`, each followed by a
  muted "Open in its own tab →" fallback link to the same URL. One honest line noting Fieldwork's two
  agentic slots stay empty until the agentic-UI study (#13) fills them.
- **PATTERN**: iframe embed pattern in Patterns-to-Follow; `.capability live` from `index.html:61`.
- **GOTCHA**: embed the **pages**, don't lift their markup — each proto owns its Worker→static
  fallback + `.proto-source` indicator (honesty surface #3 rides inside the iframe automatically).
  Same-origin iframes; the protos' root-absolute paths load fine under any host.
- **VALIDATE**: manual — both iframes render their screens; each shows its source indicator
  ("data: live mock API" with `cd worker && npx wrangler dev` running, "data: static fixtures"
  without). Fieldwork's two `data-slot` regions show their "Planned — not running yet" placeholders.
- **SATISFIES**: AC4.

### Task 6 — ADD Station 4 (Handoff) — link the viewer + download, `Runs now`

- **IMPLEMENT**: `<section class="section" id="handoff">`, `.section-label` `04 Handoff
  <span class="capability live">Runs now</span>`. Two actions: primary button/link → `/handoff`
  ("Inspect the handoff pack"); secondary → `<a href="/handoff/verdant/pack.bundle.json" download>`
  ("Download the pack — one JSON"). Check-terminate the station with a one-line "inspect the pack" cue.
- **PATTERN**: `.btn.btn-primary.btn-arrow` / `.btn.btn-secondary` (stub lines 110–113); route `/handoff` (extensionless, like `/approach`).
- **GOTCHA**: the download target is `pack.bundle.json` (the deterministic bundle, 104 KB), **not**
  `pack.json`. Both the route and the file exist only on `main` — Task 0 guaranteed the base branch.
- **VALIDATE**: manual — `/handoff` loads the viewer; the download link fetches the JSON
  (`curl -sI http://localhost:PORT/handoff/verdant/pack.bundle.json` → 200 when serving the repo).
- **SATISFIES**: AC5.

### Task 7 — UPDATE `tooling/visual-regression/visual.spec.mjs`: mask the factory iframes

- **IMPLEMENT**: In `PAGES`, change the factory entry to
  `{ name: 'factory', url: '/factory.html', kind: 'ia', mask: 'iframe.factory-embed' }`. In the test
  body, at the final screenshot call, pass the mask when present:
  `const opts = p.mask ? { mask: [page.locator(p.mask)] } : {};`
  `await expect(page).toHaveScreenshot(\`${p.name}-${pack}.png\`, opts);`
- **PATTERN**: the existing per-page-field pattern (`rows` on proto entries, `visual.spec.mjs:22–23`).
- **GOTCHA**: the pack loop wraps the single `toHaveScreenshot` call, so this one edit covers BOTH
  `factory-neutral` and `factory-saulera`. Mask reason: the iframes load async and the `kind:'ia'`
  branch does not wait for frame content; masking the (fixed-height, DOM-present) iframe boxes makes
  the baseline deterministic. Zero coverage loss — verdant/fieldwork are screenshotted standalone in
  the same suite. `page.locator('iframe.factory-embed')` resolves to two elements; `mask` accepts that.
- **VALIDATE**: `node -e "…"` not applicable; validated by Task 8's green suite.
- **SATISFIES**: AC6.

### Task 8 — REGENERATE the factory baselines (Docker) + run all gates

- **IMPLEMENT**: From `tooling/visual-regression/`, regenerate ONLY the changed baselines via the
  committed Docker path: `npm run update:docker` (it runs `--update-snapshots` inside
  `mcr.microsoft.com/playwright:v1.61.1-jammy`). Then confirm the whole suite is green:
  `npm ci && npm test` (or rely on the PR's CI job). Commit the regenerated
  `baselines/factory-neutral.png` + `baselines/factory-saulera.png` (binary; never hand-edit).
- **PATTERN**: `package.json:8` `update:docker`. The 16 existing baselines were all made this way.
- **GOTCHA**: do NOT run a bare `npx playwright test --update-snapshots` on macOS — it writes macOS
  PNGs that fail CI (Linux) with a confusing pixel diff. Docker must be running. If only these two
  baselines change, git status should show exactly `factory-neutral.png` + `factory-saulera.png`
  modified — any other baseline drift means the shared shell shifted (investigate before committing).
- **VALIDATE**: `git status --porcelain tooling/visual-regression/baselines/` lists only the two
  factory PNGs; `node tooling/token-lint.mjs` → `✓`; `node tooling/drift-check.mjs` → `✓`.
- **SATISFIES**: AC6.

---

## TESTING STRATEGY

No unit/integration test suite exists (CLAUDE.md: "no suite, no linter, no type-check — don't hunt for
or invent one"). "Done" = **run the surface you touched** + the three CI gates green.

### Unit Tests

- None. Not applicable to a static page.

### Integration Tests (the CI gates — these ARE the acceptance gate)

- **token-lint**: `node tooling/token-lint.mjs` → `✓` (page-scoped `<style>` cannot break it; proven above).
- **drift-check**: `node tooling/drift-check.mjs` → `✓` (unaffected — `factory.html` is hand-authored, no generated file or token touched).
- **visual-regression**: `cd tooling/visual-regression && npm test` → 16/16 green after regenerating the two factory baselines through the masked spec.

### Edge Cases

- **Worker down** (the default in CI + a real reader with no Worker): each embedded proto falls back to
  static fixtures and its source indicator says "data: static fixtures". Verify by loading `/factory`
  with no `wrangler dev` running — iframes still render.
- **Iframes blocked / direct access**: the "Open in its own tab →" fallback link under each iframe
  reaches the proto directly.
- **External deep link** `/factory#prototypes` (cold load): lands on the Prototypes station below the
  sticky header (90px scroll-margin). Test in a fresh tab.
- **Reduced motion**: `scroll-behavior:auto` is already global (`portfolio.css:16`); anchor jumps must
  not animate — inherited, verify no per-page smooth-scroll added.
- **saulera pack**: the visual gate also renders factory under saulera (swapped token file) — the
  shell must hold under a second pack (it will; components are token-only).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

- No linter/formatter in this repo. Sanity: `grep -c 'trackFactoryDriven' factory.html` → `0`;
  `grep -c 'class="capability live"' factory.html` → `2` (Prototypes, Handoff);
  `grep -c 'class="capability"' factory.html` → `3` (Intake, Generation, Agents).

### Level 2: Token + drift gates

- `node tooling/token-lint.mjs` → `token-lint ✓ … 0 undeclared · 0 orphan · DTCG valid`
- `node tooling/drift-check.mjs` → `✓` (no generated artifact changed)

### Level 3: Visual-regression gate

- `cd tooling/visual-regression && npm run update:docker` → regenerates `factory-{neutral,saulera}.png`
- `cd tooling/visual-regression && npm ci && npm test` → `16 passed`
- `git status --porcelain tooling/visual-regression/baselines/` → only the two factory PNGs

### Level 4: Manual Validation

- Serve the repo: `npx serve .` (repo root) → open `http://localhost:3000/factory`
- [ ] Page renders under the neutral pack; chrome (header/nav/footer) injected; Factory nav item active; no console errors.
- [ ] Station-nav chips (`#intake`…`#agents`) each scroll to their station; header not overlapping.
- [ ] `http://localhost:3000/factory#handoff` in a fresh tab lands on Station 4.
- [ ] Station 3: both proto iframes render; each source indicator reads "static fixtures" (no Worker).
      Then `cd worker && npx wrangler dev`, reload → indicators flip to "live mock API".
- [ ] Fieldwork iframe's two agentic slots show honest "Planned — not running yet" placeholders.
- [ ] Station 4: "Inspect the handoff pack" → `/handoff` loads; "Download the pack" fetches `pack.bundle.json`.
- [ ] Badges honest: Prototypes + Handoff = "Runs now"; Intake/Generation/Agents = "In build"; deferred stations link their raw surfaces (`/derive`, `/trace`).

### Level 5: Additional Validation (Optional)

- Deploy preview is not required for this slice (deploy = Step 3 of the epic). The CI PR checks
  (drift-check · token-lint · visual-regression) are the gate.

---

## ACCEPTANCE CRITERIA

- [ ] **AC1** — `factory.html` renders the five-station deep-linkable layout under the neutral pack (and saulera), chrome injected, no console errors; stub content fully replaced.
- [ ] **AC2** — Each station carries an honest capability badge: Prototypes + Handoff = `.capability live` "Runs now"; Intake, Generation, Agents = `.capability` "In build". No station claims to run what it doesn't; the three deferred stations link the raw surface that *does* run (`/derive`, `/trace`).
- [ ] **AC3** — Station deep links resolve: in-page nav chips and external `/factory#<station>` both land on the station below the sticky header.
- [ ] **AC4** — Station 3 embeds both `proto/verdant.html` + `proto/fieldwork.html`; each renders its data (Worker-first, static fallback) and shows its own source indicator; Fieldwork's two agentic slots stay honest-empty.
- [ ] **AC5** — Station 4 links the handoff viewer (`/handoff`) and offers the `pack.bundle.json` download.
- [ ] **AC6** — All three CI gates green: drift-check · token-lint · visual-regression (factory baselines regenerated via Docker through the masked spec).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order (0 → 8).
- [ ] Each task validation passed immediately.
- [ ] token-lint + drift-check pass locally.
- [ ] Visual-regression suite 16/16 green with only the two factory baselines changed.
- [ ] Manual walkthrough (Level 4) all boxes ticked, Worker-up and Worker-down.
- [ ] No `trackFactoryDriven` call, no new token, no components.css/portfolio.css change, no generator run.
- [ ] Acceptance criteria AC1–AC6 met.
- [ ] Committed on `feature/factory-shell` (branched from `main`); message references `#10` (e.g. "feat: Factory shell — five-station deep-linkable layout, prototypes embedded, handoff linked (#10, slice 10.1)").

---

## OPEN QUESTIONS / ASSUMPTIONS

**No open questions block execution.** All decisions below are FIRM (resolved 2026-07-18):

1. **iframe over markup-lift** — DECIDED. The TODO sanctions "iframe, or lift their markup"; iframe
   preserves each proto's own data-loading + source honesty and avoids duplicating ~150 lines of JS twice.
2. **Both protos shown (no toggle)** — DECIDED. The scenario toggle is a later slice; embed both directly.
3. **Deferred stations link their raw surfaces** (`/derive`, `/trace`, token contract) — DECIDED: keep
   the links. This is exactly what "what runs today" means, mirrors the current stub's honesty, and gives
   the reader something real to click now. Not a reviewer toss-up.
4. **Fixed iframe heights** — RESOLVED empirically (no longer estimates). Measured via Playbook/Playwright
   (Worker-blocked static render, `min-height` neutralized): Verdant content 1218–1252px → iframe **1280px**;
   Fieldwork 1830–1880px desktop / 2087px narrow → iframe **1920px** with a **2160px** `@media(max-width:640px)`
   bump. Rounded up so nothing clips; over-size only adds harmless bottom whitespace. Mask makes the exact
   value non-load-bearing for CI; these values are for real-user desktop/mobile UX.
5. **Page-scoped `<style>`** (not components.css + new token) — DECIDED. Proven safe against token-lint
   (UNDECLARED scans components.css only; ORPHAN can't be tripped — see below) and matches `handoff.html`.
6. **Home `index.html` "The factory — In build" card** — DECIDED: leave unchanged. "In build" stays
   literally honest — the pipeline as a whole is still in build (3 of 5 stations aren't interactive).
   Home relight is epic Step 3 ("relight the entry points" once BOTH exhibits land). Out of scope here.

**Retired risks (were flagged, now closed):**

- **Docker for baseline regen** — VERIFIED available and running (`docker` v29.2.1, daemon up) on this
  machine; Playwright + browsers already installed locally too. `npm run update:docker` will work. CI
  (`verify.yml`) has no baseline-update path — local Docker regen is the only route, and it's available.
- **token-lint ORPHAN from the rewrite** — cannot trip. The stub references no *unique* inline token
  (it uses shared portfolio.css/components.css classes); ORPHAN's consumer set spans all those files +
  every other html/proto/wc surface, so removing the stub can't drop a token below what other consumers
  provide. The new inline `<style>` only *adds* `var()` refs. Net: orphan count can only fall.

## NOTES (open canvas)

**Why this slice exists / the cut line.** #10 is one ticket but two very different cost tiers: (a) a
static shell + two already-built exhibits (cheap, no engine work) and (b) the derivation-engine
wizard + live re-skin + a recorded generation trace + the scenario toggle + the ethics moment
(expensive, gated on real interaction design and a real agent run). 10.1 ships (a) so `/factory` stops
being a stub and the flagship page starts linking the work that already exists, then hands (b) to
10.2+. The honesty contract makes this clean: an "In build" badge is *the* sanctioned way to ship a
station before its interaction exists.

**The real acceptance gate is "CI stays green," not just "page renders."** Three gates guard `main`:
drift-check (unaffected — no generated file touched), token-lint (unaffected — HTML `<style>` isn't
scanned; `factory.html` only *feeds* the orphan-consumer set), and visual-regression (the one that
bites — factory is a screenshotted page). The whole iframe-mask design exists to keep gate 3 green and
deterministic.

**Why mask, not frame-wait.** The gate's `kind:'ia'` branch waits for `.site-header`/`.site-footer`
only — never iframe content. Options were (a) teach the spec to wait for each frame's
`#source[data-source]`, or (b) mask the iframe boxes. Mask wins: the `<iframe>` element is in the DOM
*before* content loads, so a mask over a fixed-height iframe is stable with zero timing logic; and the
two protos are already screenshotted standalone in the same suite, so masking them inside the embed is
**zero coverage loss**. 10.1 owns the shell (hero, stations, badges, spacing) — that's exactly what the
factory baseline should regression-guard. Fixed CSS height + mask are one coupled decision (height →
deterministic layout/total-page-height; mask → deterministic inner paint).

**Data-flow at Station 3 (unchanged by this slice):**
`iframe /proto/verdant.html` → `loadCollection("verdant", …)` → `fetch 127.0.0.1:8787` (Worker) → on
failure, committed `scenarios/verdant/fixtures/*.json` → renders `vd-*` components + sets
`#source[data-source]`. The Factory page is a passive host; it neither knows nor needs to know the
source. Honesty surface #3 is delegated to the proto, which already does it correctly.

**Sequencing risk (low).** The only cross-file coupling is the iframe class name: `factory.html` sets
`class="factory-embed"`, `visual.spec.mjs` masks `iframe.factory-embed`. Keep them in sync — if the
class is renamed in Task 2/5, update Task 7's selector. Nothing else couples across files.

## AMENDMENTS

- 2026-07-18 — **Risk-retirement pass (plan → execution-ready).** (1) Verified **Docker running**
  (v29.2.1) + Playwright installed locally → baseline-regen path confirmed; read `verify.yml` and
  confirmed CI has no baseline-update step, so local Docker regen is the sole route (available).
  (2) **Measured the two iframe heights** with the local Playwright (Worker-blocked static render,
  `min-height:0` like the visual spec, at widths 1120/900/600): Verdant 1218–1252px (phone pinned 800),
  Fieldwork 1830–1880px desktop / 2087px narrow. Replaced the earlier 780/640px *guesses* (which would
  have clipped) with **1280px / 1920px (+2160px ≤640px)**, rounded up. (3) **Decided the two open
  questions**: keep the raw-surface links on deferred stations; leave Home's "In build" card unchanged
  (still honest). (4) Recorded that the token-lint ORPHAN check cannot be tripped by the rewrite.
  Confidence for one-pass success: **9/10 → 9.5/10** (only residual: first `update:docker` run may
  need to pull the ~2 GB Playwright image if not cached).
