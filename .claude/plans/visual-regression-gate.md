# Feature: Visual-regression gate — Playwright screenshots of shipped pages under neutral + one client pack (ticket #9, gate 3 of 3)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, paths, and the exact Playwright version ↔ Docker image tag handshake (§GOTCHA). Import from the right files; root the static server at the **repo root**, not the tooling dir.

## Feature Description

The **third and final** CI verification gate for ticket #9. A self-contained, dependency-isolated Playwright project that:

- Serves the repo statically (a tiny zero-dep `node:http` server) and drives a headless Chromium over the **six shipped IA pages** (`index`, `approach`, `factory`, `work`, `contact`, `404`).
- Screenshots each page **twice** — once under the **neutral pack** (as shipped), once under **one client pack** (`system/tokens.saulera.css`, the committed reference pack) applied by **swapping the single `tokens.neutral.css` link at request time** (Playwright route interception) — which is *literally* the platform's "re-skin from one line of CSS" claim, executed.
- Pixel-diffs each capture against a **committed PNG baseline** via `@playwright/test`'s native `toHaveScreenshot()`; fails on any divergence and emits a diff image + HTML report.
- Runs **locally and in CI inside the same pinned Playwright Docker image** so rendering is byte-stable across platforms (the standard fix for screenshot flakiness).

Landing this gate closes ticket #9 — all three gates (drift-check, token-lint, visual-regression) are then green in CI.

## User Story

As a **technical hiring manager inspecting this repo**
I want **the "one-line re-skin, drift-proof design system" claim backed by a green CI gate that renders every shipped page under two brand packs and provably fails on any visual regression**
So that **I can see the re-skin actually works and trust that a CSS change can't silently break a page — without opening a browser myself.**

(Secondary user: the repo author — the gate catches an unintended visual change in the big UI tickets before it lands, and the baseline diff *is* the "demonstrated workflow" evidence #9 wants.)

## Problem Statement

Ticket #9 specifies three CI gates, each itself portfolio evidence. Two landed (drift-check, token-lint); the third is deferred and open:

> **visual regression:** Playwright screenshots of shipped pages under the neutral pack + one client pack, pixel-diffed against committed baselines. No Storybook/Chromatic — the vanilla constraint holds.

Nothing today verifies on push/PR that:
1. The shipped pages still *render* correctly (a token/component/CSS edit can regress a page with no error and no drift-check signal — drift-check only compares generated files to their source, not rendered output).
2. The **re-skin mechanic works** — that swapping the pack link actually re-skins every page rather than leaving some surface pinned to neutral.
3. An **intentional** CSS change is caught as a visible diff (the AC's positive control).

## Solution Statement

Add a dependency-isolated `tooling/visual-regression/` Playwright project (mirroring how `tooling/style-dictionary/` isolates its one heavy dep), plus a `visual` job in the existing `.github/workflows/verify.yml`. Use `@playwright/test`'s built-in `toHaveScreenshot()` for baseline management + pixel-diff (least code, native diff report) rather than hand-rolling `pixelmatch`. Apply the client pack by **route-intercepting the `tokens.neutral.css` request and fulfilling it with `tokens.saulera.css`'s bytes** — no shipped-page edits, and the most faithful model of "swap one file." Generate and compare baselines **only** inside the pinned Playwright Docker image (local via `docker run`, CI via `container:`) so the neutral and client baselines are platform-stable. Commit the ~12 baseline PNGs (repo commits its artifacts). Demonstrate the intentional-change diff once (recorded in the PR), then keep the gate green.

## Out of Scope / Non-Goals

- **Not included (v1): the data-connected proto pages** (`proto/verdant.html`, `proto/fieldwork.html`) and **the interactive demo surfaces** (`derive.html`, `agentic.html`, `trace.html`). These fetch the mock Worker / run view-time derivation / replay traces, so their rendered state has network + settle timing that a first, stable gate should not carry. **Deferred to a fast follow-up** (see Open Questions — proto pages are the thesis centerpiece and are the #1 follow-up). Adding a page later is a one-line change to the `PAGES` array + a baseline update.
- **Not included: multiple client packs or responsive/mobile viewports.** One client pack (saulera) at one desktop viewport (1280×800). Multi-pack / multi-viewport is a trivial future extension of the same loop; out of scope now.
- **Not included: saulera's custom fonts.** The `fonts/` directory is **not in this repo**, so saulera's `@import "../fonts/fonts.css"` 404s and its named faces (Homizio / Montserrat Ace) fall back to the platform default. The client-pack baseline therefore demonstrates saulera's **colour / radius / spacing / type-scale** re-skin, **not** its typography. This is honest and deterministic (same fallback every Linux run); it is called out in the PR body, not hidden.
- **Not changing** any shipped page, token, component, generator, or the existing `verify` job (drift + lint). The gate is purely additive. If the **first** baseline generation surfaces a *real* rendering bug on a page, **stop and flag it** — do not "fix" a page to make a baseline look right.
- **Not adding a shipped-page dependency.** Playwright is **factory tooling** (ticket #9 sanctions this explicitly), confined to `tooling/visual-regression/` with its own lockfile — exactly as Style Dictionary is confined. Shipped pages stay vanilla, zero-dep, no build step.
- **Not** Storybook / Chromatic / any hosted visual service (ticket #9 forbids; the vanilla constraint holds).

## Feature Metadata

**Feature Type**: New Capability (verification infrastructure — completes #9)
**Estimated Complexity**: Low–Medium. Small code surface (one config, one spec, one ~40-line server, one CI job). The first-run shakedown that would normally make this Medium — baseline stability, the version↔image handshake, threshold tuning — was **executed end-to-end during planning** (a full Docker spike; see NOTES §"Empirical validation"), so the hard part is done and captured in the spec. A reproducible reference implementation exists in the working tree.

**Validated: yes** — built + run in the pinned Docker image; 12 baselines generated, **5/5 + independent clean runs green, 0-px noise floor**, positive control confirmed, the one instability found and fixed. Confidence for one-pass execution: **9.5/10**.
**Primary Systems Affected**: `tooling/visual-regression/` (new, dependency-isolated), `.github/workflows/verify.yml` (add one job). **No product code touched.**
**Dependencies**: `@playwright/test@1.61.1` (current stable, verified `npm view`) confined to `tooling/visual-regression/`; Docker (local baseline parity) — CI uses the same image via `container:`.

## Related Work

**Implements**: GitHub issue **#9** (the third gate). **Closure is conditional on the page-scope decision** (Open Questions ★): 6 IA pages satisfies #9's generic "shipped pages" wording, so a 6-page v1 legitimately **`Closes #9`**; if the user pulls the proto pages into v1 instead, this becomes **`Part of #9`** and closure waits for that follow-up. Default assumption: 6-page v1 → `Closes #9`. · **Epic**: #1 (`docs/epics/ai-first-ux-factory.architecture.md` §Other eng-lead calls — "Verification gates").

**Back-references** (plans this builds on / inherits decisions from):

- `.claude/plans/ci-verification-gates.md` — Why: the parent plan; delivered gates 1–2 (drift-check, token-lint) and **forward-referenced this file by name** as the deferred third gate. Inherit its conventions: zero-dep-where-possible, governing-doc file headers, named-`Error` exit idiom, "commit the generated artifacts", isolated dep-carrying tools, **Docker-for-cross-platform-determinism** (its NOTES §Cross-platform determinism established the pattern this gate reuses for screenshots).
- `.claude/reports/ci-verification-gates-report.md` — Why: records the "prove the failure mode once, record in PR, revert, keep green" discipline this gate repeats for the intentional-change diff.
- `CLAUDE.md` (Ground rules · "Factory tooling is unrestricted but stays zero-dep Node ESM where possible — the portal's sole dependency is …"; "Deploy = commit the artifacts") — Why: sanctions Playwright as an isolated factory dep and mandates committing the baseline PNGs.

**Forward-references** (plans that extend / supersede this):

- (to create, if pursued) a follow-up adding proto + interactive pages to the `PAGES` array behind per-page settle strategies.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING!

- `portal/server.mjs` (lines 11–27) — Why: the **exact zero-dep static-server pattern to MIRROR** in the new `serve.mjs` — the `MIME` map, and `serveFile()` with its path-traversal guard (`target.startsWith(base + path.sep)`) and `/` → `index.html` directory handling. Copy the shape; root it at the **repo root**, drop the portal's API/sites/jobs-folder routing.
- `index.html` (lines 13–17 head, lines ~ tail `<script>` block) — Why: the pack-load contract every IA page follows — `tokens.contract.css` → **`tokens.neutral.css`** → `components.css` → `portfolio.css`, then body-end `client.neutral.config.js` → `site.js` → `portfolio.js` → `analytics.mjs`. **`tokens.neutral.css` is the single link the gate swaps.** Chrome (header/footer) is injected by `site.js` **after** load → the screenshot must wait for it.
- `system/site.js` (whole file, 143 lines) — Why: injects `.site-header` (prepended to `<body>`) and `.site-footer` (appended) from `window.CLIENT_CONFIG`. **Wait for `.site-header` + `.site-footer` to exist before screenshotting.** Purely synchronous DOM build, no network, no timers → deterministic once run.
- `system/portfolio.js` (whole file, 70 lines) — Why: confirms **no scroll-reveal / opacity / IntersectionObserver animation** — only a skip link, a `.to-top` button that starts **hidden** (`updateToTop()` leaves `.show` off at `scrollY 0`), and an inert `<dialog>` lightbox. So a full-page screenshot at load is stable; nothing animates content into place.
- `system/tokens.saulera.css` (whole file, 104 lines) — Why: **the client pack.** Its "SEMANTIC MAP" (lines 79–103) overrides **every** contract token — **verified**: `comm` of contract-declared vs saulera-declared tokens is **empty** (saulera misses no contract semantic token). Line 19 `@import url("../fonts/fonts.css")` targets a **non-existent** dir (fonts fall back — see Non-Goals). Loaded-after-contract override is exactly what the route swap reproduces.
- `system/tokens.neutral.css` (lines 1–20) — Why: the default pack; the swap target. Its 55 declarations include 8 private primitives (`--color-blue*`, `--color-ink`, `--color-slate`, …) saulera doesn't share — irrelevant, they're neutral-internal; both packs fully define the contract.
- `.github/workflows/verify.yml` (whole file, 33 lines) — Why: the workflow to **extend** with a second job. Mirror its style (top comment citing #9, `on: { push: {branches:[main]}, pull_request: {} }`, pinned action majors). Its header currently says the third gate "is deferred" — **update that line** since this job lands it. Do **not** touch the existing `verify` job.
- `tooling/style-dictionary/package.json` + `package-lock.json` — Why: the **precedent** for a dependency-isolated factory tool with its own lockfile invoked in CI via `npm ci` in a `working-directory`. `tooling/visual-regression/` follows the same shape.
- `docs/epics/ai-first-ux-factory.architecture.md` (§Other eng-lead calls — "Verification gates") — Why: the governing decision; confirms the three-gate split and that these gates "check [the DTCG inversion's] outputs". Skim to confirm no visual-regression detail contradicts this plan.

### New Files to Create

- `tooling/visual-regression/serve.mjs` — zero-dep `node:http` static server rooting the **repo root** at `http://127.0.0.1:4757` (MIRROR `portal/server.mjs:11–27`). Launched by Playwright's `webServer`.
- `tooling/visual-regression/playwright.config.mjs` — one chromium project; `webServer` runs `serve.mjs`; platform-agnostic `snapshotPathTemplate`; determinism `use` block; `toHaveScreenshot` defaults.
- `tooling/visual-regression/visual.spec.mjs` — the `PAGES` × `PACKS` screenshot loop with the pack-swap route + external-request block.
- `tooling/visual-regression/package.json` — `@playwright/test@1.61.1` (exact pin); `type: module`; scripts `test`, `update:docker`.
- `tooling/visual-regression/package-lock.json` — generated by `npm install` (commit it; CI uses `npm ci`).
- `tooling/visual-regression/baselines/*.png` — **12 committed baselines** (`<page>-neutral.png`, `<page>-saulera.png` × 6 pages), generated inside the pinned Docker image.
- `tooling/visual-regression/.gitignore` — ignore Playwright run output only: `node_modules/`, `test-results/`, `playwright-report/` (NOT `baselines/`).

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Playwright — Visual comparisons / `toHaveScreenshot`](https://playwright.dev/docs/test-snapshots) — Sections: "toHaveScreenshot", "Updating screenshots", "`--update-snapshots`" — Why: native baseline mgmt + pixel diff; how baselines are named/stored; `maxDiffPixelRatio`/`threshold`/`animations`.
- [Playwright — `snapshotPathTemplate`](https://playwright.dev/docs/api/class-testconfig#test-config-snapshot-path-template) — Section: tokens (`{arg}`, `{ext}`, `{platform}`, `{projectName}`) — Why: build a **platform-agnostic** single-baseline path (omit `{platform}`/`{projectName}`).
- [Playwright — `Page.route` / `Route.fulfill`](https://playwright.dev/docs/api/class-route#route-fulfill) — Section: `fulfill({ path })` — Why: serve saulera's bytes for the neutral request; route ordering is last-registered-first.
- [Playwright — `webServer`](https://playwright.dev/docs/test-webserver) — Section: `command` / `url` / `reuseExistingServer` — Why: launch `serve.mjs`, wait for readiness.
- [Playwright — Docker](https://playwright.dev/docs/docker) — Section: image tags (`mcr.microsoft.com/playwright:v1.61.1-jammy`) — Why: the image tag **must equal** the installed `@playwright/test` version.
- [Playwright — CI (GitHub Actions `container`)](https://playwright.dev/docs/ci#via-containers) — Section: "Via containers" — Why: run the `visual` job inside the pinned image (browsers pre-installed).
- [`emulateMedia` / `use.colorScheme` / `use.reducedMotion`](https://playwright.dev/docs/api/class-testoptions#test-options-color-scheme) — Why: pin `colorScheme: 'light'`, `reducedMotion: 'reduce'` for determinism.

### Patterns to Follow

**File header (governing-doc citation — project convention).** Every entry-point file opens citing its doc. Mirror `tooling/drift-check.mjs:1–7`. Example for the spec:
```js
// tooling/visual-regression/visual.spec.mjs — CI visual-regression gate (epic #1, ticket #9, gate 3/3).
// Screenshots the six shipped IA pages under the neutral pack + one client pack (saulera, applied by
// swapping the single tokens.neutral.css link), pixel-diffed vs committed baselines. Playwright is
// factory tooling (ticket #9), isolated here — never a shipped-page dependency. Run: see README/CI.
```

**Zero-dep static server (MIRROR `portal/server.mjs:11–27`).** Same `MIME` map + `serveFile` traversal guard; root = repo root; `/` → `index.html`; no other routing.
```js
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'); // repo root
```

**Reuse, don't re-implement.** Use `@playwright/test`'s `toHaveScreenshot` (baseline + diff + report) — do NOT add `pixelmatch`/`pngjs` or hand-roll diffing. Use its `webServer` — do NOT add `serve`.

**Isolated dep-carrying tool (MIRROR `tooling/style-dictionary/`).** Own `package.json` + `package-lock.json`; CI installs with `npm ci` in a `working-directory`; nothing leaks to shipped pages.

**Data-driven, legible test loop.** A reader should see the two axes and the swap at a glance:
```js
const PAGES = ['index','approach','factory','work','contact','404']; // shipped IA (see Non-Goals for deferred)
const PACKS = { neutral: null, saulera: resolve(REPO,'system/tokens.saulera.css') };
for (const [pack, packPath] of Object.entries(PACKS))
  for (const page of PAGES)
    test(`${page} · ${pack}`, async ({ page: pw }) => { /* block externals; if packPath, route-swap; goto; wait chrome+fonts; normalize (text-wrap+min-height); set integer viewport = content height; toHaveScreenshot(`${page}-${pack}.png`) */ });
```

---

## IMPLEMENTATION PLAN

Phases run top to bottom. **Phase 1 (scaffold + server + config + spec) must precede Phase 2 (baseline generation)** — you cannot generate baselines without the harness. Phase 3 (CI) depends on committed baselines. Phase 4 proves the gate.

### Phase 1: Harness scaffold (`tooling/visual-regression/`)

Create the isolated project: `package.json` (pin `@playwright/test@1.61.1`), `serve.mjs` (mirror portal server, repo root), `playwright.config.mjs` (webServer + determinism knobs), `visual.spec.mjs` (the loop + route-swap + external block), `.gitignore`. `npm install` to produce the lockfile and pull the JS package. **No browsers installed on the host** — all runs go through Docker.

### Phase 2: Generate + commit baselines (inside the pinned Docker image)

**Depends on:** Phase 1.

Run `--update-snapshots` **inside `mcr.microsoft.com/playwright:v1.61.1-jammy`** (browsers pre-installed) so baselines are Linux-rendered — the exact platform CI compares on. Inspect the 12 PNGs by eye: (a) each page renders fully (chrome present, no broken layout), (b) the `-saulera` pair **visibly differs** from `-neutral` (different accent/ground/borders — proves the re-skin). Commit `baselines/`.

### Phase 3: Wire the `visual` CI job (`.github/workflows/verify.yml`)

**Depends on:** Phase 2 (baselines must be committed to compare against).

Add a **second job** `visual` to the existing workflow, running **in the pinned container**, `npm ci` + `npx playwright test` in `tooling/visual-regression`, uploading the Playwright report as an artifact on failure. Leave the `verify` job untouched; update the file's top comment (the third gate is no longer deferred).

### Phase 4: Prove the gate, then keep it green

**Depends on:** Phases 1–3.

Demonstrate the **intentional-change-shows-a-diff** AC: make a temp visible CSS edit (e.g. change `--color-accent` in `tokens.neutral.css` or a `components.css` value) → run the gate → it fails with a diff PNG naming the changed page(s) → **revert**. Record the failure output + diff in the PR body. Confirm green on the clean tree.

---

## STEP-BY-STEP TASKS

Execute in order. Each is atomic and independently testable.

### CREATE `tooling/visual-regression/package.json`

- **IMPLEMENT**:
  ```json
  {
    "name": "ux-factory-visual-regression",
    "private": true,
    "type": "module",
    "description": "CI visual-regression gate (epic #1, ticket #9, gate 3/3) — factory tooling, isolated.",
    "scripts": {
      "test": "playwright test",
      "update:docker": "docker run --rm --ipc=host -v \"$PWD/../..\":/work -w /work/tooling/visual-regression mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test --update-snapshots'"
    },
    "devDependencies": { "@playwright/test": "1.61.1" }
  }
  ```
- **PATTERN**: `tooling/style-dictionary/package.json` (isolated, private, pinned dep).
- **GOTCHA**: **Pin the EXACT version** (`"1.61.1"`, no `^`). The Docker image tag (`v1.61.1-jammy`) MUST equal this — a mismatch = wrong browser build = spurious diffs. If a newer stable exists at implementation time, use it consistently in **all four places** (this dep, the two Docker tags in `update:docker` + CI, and any README).
- **VALIDATE**: `cd tooling/visual-regression && npm install` → creates `package-lock.json`, exit 0.
- **SATISFIES**: AC — Playwright isolated as factory tooling.

### CREATE `tooling/visual-regression/serve.mjs`

- **IMPLEMENT**: MIRROR `portal/server.mjs:11–27`. Header comment (cite #9). `import { createServer } from 'node:http'`; `readFileSync, existsSync, statSync` from `node:fs`; `path`; `fileURLToPath` from `node:url`. `const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')`. Copy the `MIME` map and `serveFile(res, base, rel)` (traversal guard + `/` → `index.html`). Server: on every request, `serveFile(res, ROOT, url.pathname === '/' ? '/index.html' : url.pathname)`; 404 → `res.writeHead(404).end('not found')`. `listen(Number(process.env.PORT||4757), '127.0.0.1')`; log a one-line ready message.
- **PATTERN**: `portal/server.mjs:11–27, 19–27` (MIME + `serveFile` + traversal guard).
- **IMPORTS**: `node:http`, `node:fs`, `node:path`, `node:url` only. Zero deps.
- **GOTCHA**: (1) Root at **repo root** (`../..`) — pages use root-absolute `/system/…`, `/assets/…`. (2) Navigation targets are explicit `*.html` (`/index.html`, `/404.html`) — no clean-URL routing needed (in-page nav hrefs don't affect a static screenshot). (3) Keep the traversal guard — even though local-only, it's the pattern and it's cheap.
- **VALIDATE**: `PORT=4757 node tooling/visual-regression/serve.mjs &` then `curl -sI http://127.0.0.1:4757/index.html | head -1` → `200`; `curl -sI http://127.0.0.1:4757/system/tokens.neutral.css | head -1` → `200`; kill it.
- **SATISFIES**: AC — pages served for screenshotting, zero-dep.

### CREATE `tooling/visual-regression/playwright.config.mjs`

- **IMPLEMENT**:
  ```js
  import { defineConfig, devices } from '@playwright/test';
  export default defineConfig({
    testDir: '.',
    snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',   // platform-agnostic: ONE baseline set
    forbidOnly: !!process.env.CI,
    fullyParallel: true,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
      baseURL: 'http://127.0.0.1:4757',
      viewport: { width: 1280, height: 800 },
      colorScheme: 'light',
      reducedMotion: 'reduce',
    },
    expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 100 } }, // measured floor = 0px (spike); 100 = host-AA insurance
    webServer: {
      command: 'node serve.mjs',
      url: 'http://127.0.0.1:4757/index.html',
      reuseExistingServer: !process.env.CI,
      env: { PORT: '4757' },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  });
  ```
- **PATTERN**: standard Playwright config.
- **GOTCHA**: (1) `snapshotPathTemplate` OMITS `{platform}`/`{projectName}` → one baseline set (`baselines/index-neutral.png`), legible + Docker-pinned. A bare `playwright test` on macOS then **fails loudly** vs the Linux baseline (desired — it won't silently overwrite unless `--update-snapshots`). (2) **`maxDiffPixels: 100` is empirically justified, not a guess** — the planning spike measured a **0-px noise floor** across multiple independent runs in this exact image (given the spec's single-frame integer-viewport capture + normalizations), so 100 is pure host-AA insurance for GitHub's runner (~4 orders of magnitude below any real regression; the accent positive-control moved ~12k+ px). Do NOT use a `maxDiffPixelRatio` here — on the ~8000px page a 1% ratio is ~100k px of slack that would hide real changes. (3) `animations: 'disabled'` freezes CSS transitions; combined with `reducedMotion: 'reduce'` it also quiets the smooth-scroll path. (4) `webServer.url` points at a real file (`/index.html`) since `/` also serves index — either works.
- **VALIDATE**: covered by the spec run (next task).
- **SATISFIES**: AC — deterministic capture config; committed-baseline mechanism.

### CREATE `tooling/visual-regression/visual.spec.mjs`

- **IMPLEMENT**: Header (cite #9, gate 3/3, Playwright-is-factory-tooling). Imports:
  ```js
  import { test, expect } from '@playwright/test';
  import { fileURLToPath } from 'node:url';
  import path from 'node:path';
  const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const PAGES = ['index', 'approach', 'factory', 'work', 'contact', '404'];
  const PACKS = { neutral: null, saulera: path.join(REPO, 'system/tokens.saulera.css') };
  ```
  - `test.beforeEach`: **block all external requests** (hermeticity) —
    ```js
    await page.route('**/*', (route) => {
      const host = new URL(route.request().url()).hostname;
      return host === '127.0.0.1' ? route.continue() : route.abort();
    });
    ```
  - The loop (`for (const [pack, packPath] of Object.entries(PACKS)) for (const name of PAGES)`), each a `test(\`${name} · ${pack}\`, async ({ page }) => { … })`:
    1. **If `packPath`**, register the pack swap **after** beforeEach so it wins for the neutral URL:
       ```js
       await page.route('**/system/tokens.neutral.css', (route) => route.fulfill({ path: packPath }));
       ```
    2. `await page.goto(\`/${name}.html\`, { waitUntil: 'load' });`
    3. Wait for JS-injected chrome + fonts:
       ```js
       await page.waitForSelector('.site-header');
       await page.waitForSelector('.site-footer');
       await page.evaluate(() => document.fonts.ready);
       ```
    4. **Normalize two non-deterministic layout features** (both are no-ops on the real pages — see GOTCHA (4) — so they change zero baseline pixels, they only make capture deterministic):
       ```js
       await page.addStyleTag({ content: '*, *::before, *::after { text-wrap: wrap !important; } html, body { min-height: 0 !important; }' });
       ```
    5. **Capture as ONE frame at an integer viewport = content height** (NOT `fullPage: true`):
       ```js
       const h = await page.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().height));
       await page.setViewportSize({ width: 1280, height: h });
       await expect(page).toHaveScreenshot(`${name}-${pack}.png`);
       ```
- **PATTERN**: data-driven loop (Patterns §). Route ordering: last-registered-first — the pack swap (registered in-test) precedes the beforeEach block, so the neutral URL is fulfilled with saulera; everything else falls through to the block (local → continue, external → abort).
- **IMPORTS**: `@playwright/test`, `node:url`, `node:path`.
- **GOTCHA**: (1) `route.fulfill({ path })` infers `text/css` from `.css`; the saulera bytes' inner `@import "../fonts/fonts.css"` resolves against the request URL → `127.0.0.1/fonts/fonts.css` → served 404 by `serve.mjs` (local, harmless; fonts fall back). (2) `document.fonts.ready` resolves once font loading settles (incl. the failed saulera @import) — prevents a mid-font-swap capture. (3) `404.html` renders like any page (loads packs + chrome) — screenshot it the same way; the server returns its bytes at `/404.html` with 200 (we navigate to it directly). (4) **Do NOT use `fullPage: true`, and DO keep the normalization + integer-viewport steps — this is the load-bearing fix the spike found (see NOTES §"Empirical validation").** `fullPage`'s auto-resize stitching wobbles the tallest page's captured height ±2px and intermittently fails Playwright's "two consecutive stable screenshots" (observed ~1 in 4 runs). Root causes: Chromium's non-deterministic `text-wrap: balance` re-solving on the resize, and `body { min-height: 100vh }` (components.css:35) re-resolving `100vh` against the content-height viewport. Both normalizations are **no-ops on the real pages** (every page's content already exceeds 100vh, and the balancer only sets wrap points), so they alter **no** baseline pixel — they only remove the wobble. The single-frame integer-viewport capture then sidesteps stitching entirely: **5/5 + independent runs green, 0-px floor** (spike). (5) `.to-top` is `position: fixed` and hidden at `scrollY 0` — never in the capture.
- **VALIDATE** (Docker, first real run — generates baselines):
  ```bash
  cd tooling/visual-regression && npm run update:docker
  ```
  → 12 PNGs written under `baselines/`, run exits 0. Then a clean compare:
  ```bash
  docker run --rm --ipc=host -v "$PWD/../..":/work -w /work/tooling/visual-regression \
    mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
  ```
  → all 12 tests **pass** (baseline == fresh capture). Eyeball each `-saulera` vs `-neutral`: visibly different.
- **SATISFIES**: AC — screenshots under neutral + one client pack; baselines the compare source.

### CREATE `tooling/visual-regression/.gitignore`

- **IMPLEMENT**: `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`, `.cache/`. **Do NOT ignore `baselines/`** — baselines are committed artifacts.
- **PATTERN**: repo commits generated artifacts (CLAUDE.md); only transient run output is ignored.
- **VALIDATE**: `git status --porcelain tooling/visual-regression/` shows `baselines/*.png`, the 4 source files, `package-lock.json` — and NOT `node_modules`/`test-results`/`playwright-report`.
- **SATISFIES**: baselines committed; run noise excluded.

### COMMIT baselines + harness (explicit paths)

- **IMPLEMENT**: Branch `feature/visual-regression-gate` from `main`. Stage explicit paths only: the 4 source files, `package.json`, `package-lock.json`, `.gitignore`, `baselines/`. One commit: `feat: visual-regression gate — Playwright screenshots under neutral + saulera pack (#9)`.
- **GOTCHA**: shared-worktree discipline (memory `shared-worktree-parallel-sessions`) — verify branch immediately before committing; stage by explicit path; never `git add -A`.
- **VALIDATE**: `git status` clean after commit; `git show --stat` lists exactly the expected files (incl. 12 PNGs).
- **SATISFIES**: baselines committed to the repo.

### UPDATE `.github/workflows/verify.yml` — add the `visual` job

- **IMPLEMENT**: Update the top comment: the third gate (visual regression) is no longer deferred — this job lands it, so the workflow now **closes #9**. Add a second job (leave `verify` untouched):
  ```yaml
  visual:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.61.1-jammy
    steps:
      - uses: actions/checkout@v4
      - name: Install Playwright (JS)
        run: npm ci
        working-directory: tooling/visual-regression
      - name: Visual regression
        run: npx playwright test
        working-directory: tooling/visual-regression
      - name: Upload diff report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: tooling/visual-regression/playwright-report/
          retention-days: 7
  ```
- **PATTERN**: the existing `verify` job (checkout → install-in-working-directory → run); Playwright CI-via-container doc.
- **GOTCHA**: (1) The container **image tag must equal** `@playwright/test`'s pinned version (`v1.61.1-jammy` ↔ `1.61.1`) — browsers are baked into the image at that build. (2) No `setup-node` needed — the image ships Node. (3) This job runs **no git commands**, so no `safe.directory` dance (unlike drift-check). (4) `npm ci` requires the committed `package-lock.json`. (5) `--ipc=host` isn't settable on `container:`; the official image + GitHub's runner default is fine for chromium here (single page, no shared-memory crash risk at this scale — if chromium OOMs on `/dev/shm`, add `--disable-dev-shm-usage` via `launchOptions.args`, but do not pre-emptively).
- **VALIDATE**: push branch → open PR → the `visual` job appears, installs, and **passes**. (First live run is the real validator — see Phase 4.)
- **SATISFIES**: AC — visual gate wired as a GitHub Action on push(`main`)+PR.

### PROVE the intentional-change diff + record in PR (do NOT commit the temp edit)

- **IMPLEMENT**:
  - Temp edit a **visible** token: e.g. in `system/tokens.neutral.css` change `--color-accent` to a clearly different hue → run the gate in Docker (`npm test` via the docker compare command above) → it **fails**, naming the affected page(s) and writing diff PNGs under `test-results/` + the HTML report → `git checkout system/tokens.neutral.css`.
  - Paste the failing output (and note the diff artifact) into the PR body as AC evidence.
- **PATTERN**: the prior gates' "prove the failure mode once, record, revert, keep green" (`ci-verification-gates-report.md`).
- **GOTCHA**: revert the temp edit; the committed tree stays green. Do the demonstration **in Docker** (a macOS bare run would fail against the Linux baseline for the wrong reason — platform, not the edit).
- **VALIDATE**: after revert, the Docker compare run exits 0 (all 12 pass); `git status --porcelain` clean.
- **SATISFIES**: AC — an intentional CSS change shows as a diff.

### OPEN PR (`Closes #9`)

- **IMPLEMENT**: PR body: **summary · what changed · validation status**; the intentional-change demonstration + note the diff artifact; the saulera-fonts honesty note (Non-Goals); the deferred proto/interactive follow-up. **Closure keyword follows the scope decision (Open Questions ★):** if v1 shipped the 6 IA pages (default), say **`Closes #9`** (all three gates now green); if proto pages were pulled in and still pending, say **`Part of #9`**. Title mirrors the commit.
- **VALIDATE**: PR opens; **both** `verify` and `visual` jobs run and are green on `pull_request`.
- **SATISFIES**: wiring + evidence trail + issue closure.

### POST-MERGE: `/rules-check-drift`

- **IMPLEMENT**: after merge, run `/rules-check-drift` so `CLAUDE.md`'s architecture map gains `tooling/visual-regression/` (and the `verify.yml` note updates). Confirm #9 auto-closed.
- **VALIDATE**: `CLAUDE.md` architecture map references the visual-regression tool; issue #9 state = closed.
- **SATISFIES**: rules-file truth maintenance.

---

## TESTING STRATEGY

No unit-test suite exists (project rule) — the gate **is** the verification surface. "Testing" here = generating stable baselines, running the compare, and proving the positive-control diff.

### Unit Tests
None (would violate the zero-dep/no-suite convention). The spec is a thin driver over Playwright's tested primitives.

### Integration Tests
The spec **is** the integration test: it serves the real repo and drives a real browser over real pages under both real packs. `npx playwright test` (in Docker) is the run; the CI `visual` job is the same in a clean checkout.

### Edge Cases (must be demonstrated / handled)
- **Intentional visible CSS change** → gate fails with a diff PNG (the AC positive control — demonstrated once, reverted).
- **Client-pack swap actually re-skins** → each `-saulera` baseline visibly differs from its `-neutral` pair (verified by eye at baseline generation; a swap that silently no-ops would make identical pairs — a red flag to investigate, not baseline over).
- **Missing font `@import` (saulera)** → 404 served locally, fonts fall back deterministically; `document.fonts.ready` still resolves. Handled by external-block + local 404.
- **JS-injected chrome not yet present** → guarded by `waitForSelector('.site-header'/'.site-footer')`.
- **Cross-platform render drift** → eliminated by generating + comparing **only** in the pinned Docker image (local + CI same tag).

---

## VALIDATION COMMANDS

Run from repo root unless noted. All screenshot runs go through the pinned Docker image.

### Level 1: Syntax & harness
```bash
node --check tooling/visual-regression/serve.mjs
node --check tooling/visual-regression/visual.spec.mjs
node --check tooling/visual-regression/playwright.config.mjs
(cd tooling/visual-regression && npm install)          # lockfile + JS package
PORT=4757 node tooling/visual-regression/serve.mjs & sleep 1; \
  curl -sI http://127.0.0.1:4757/index.html | head -1; \
  curl -sI http://127.0.0.1:4757/system/tokens.neutral.css | head -1; kill %1   # both 200
```

### Level 2: Baseline generation (Docker) + clean compare
```bash
cd tooling/visual-regression
npm run update:docker            # generates 12 baselines/*.png (Linux), exit 0
# clean compare — must all pass:
docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression \
  mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'
```

### Level 3: Positive control (revert after)
```bash
# temp: change --color-accent in system/tokens.neutral.css to a different hue, then:
docker run --rm -v "$PWD/../..":/work -w /work/tooling/visual-regression \
  mcr.microsoft.com/playwright:v1.61.1-jammy sh -c 'npm ci && npx playwright test'   # FAILS with diffs
git checkout system/tokens.neutral.css
```

### Level 4: CI (manual)
Open the PR; confirm the `visual` job runs in the container, `npm ci`s, and passes. Push a throwaway visible CSS edit on the branch to watch it go red (report artifact uploaded), then revert.

### Level 5: Additional
`gh run list --workflow=verify.yml` after the first push. Existing gates still green: `node tooling/drift-check.mjs && node tooling/token-lint.mjs` (unchanged by this work).

---

## ACCEPTANCE CRITERIA

Closes the remaining #9 criteria:

- [ ] Playwright screenshots the six shipped IA pages under the **neutral pack** AND **one client pack** (saulera), the pack applied by swapping the single `tokens.neutral.css` link.
- [ ] **Baselines committed** (12 PNGs under `tooling/visual-regression/baselines/`), Linux-rendered via the pinned Docker image.
- [ ] An **intentional CSS change shows as a diff** — demonstrated once (recorded in the PR), then green.
- [ ] The gate is **runnable locally** (Docker: `npm run update:docker` to (re)baseline, the docker compare to check) **AND wired as a GitHub Actions** `visual` job on push(`main`)+PR (see deviation note re "plain Node script").
- [ ] Playwright is **isolated** in `tooling/visual-regression/` with its own lockfile — **no shipped-page dependency**; no Storybook/Chromatic.
- [ ] `@playwright/test` version === Docker image tag in all locations (dep, `update:docker`, CI job).
- [ ] Existing `verify` job (drift + lint) untouched and still green; **no product code/token/spec/fixture changed**.
- [ ] PR closure keyword matches the scope decision (**`Closes #9`** for the 6-page v1 default; **`Part of #9`** if proto pages were pulled into v1 and remain pending); saulera-fonts honesty note + deferred proto/interactive follow-up recorded.

**Deferred (documented follow-up, NOT this ticket):** proto pages (`proto/verdant`, `proto/fieldwork`) and interactive surfaces (`derive`, `agentic`, `trace`); multi-viewport; multi-pack.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order.
- [ ] `npm run update:docker` produced 12 baselines; clean Docker compare → all pass.
- [ ] Each `-saulera` baseline visibly differs from its `-neutral` pair (re-skin proven).
- [ ] Positive-control diff demonstrated + pasted into the PR; temp edit reverted; tree green.
- [ ] `serve.mjs` mirrors the portal server pattern (traversal guard, repo-root, MIME map); zero-dep.
- [ ] Version↔image-tag handshake consistent in package.json, `update:docker`, and CI.
- [ ] `.gitignore` excludes run output, includes `baselines/`.
- [ ] `visual` job added to `verify.yml`; `verify` job unchanged; PR shows both green.
- [ ] Files open with governing-doc headers; committed on `feature/visual-regression-gate`; PR `Closes #9`.
- [ ] Post-merge `/rules-check-drift`; #9 closed.

---

## OPEN QUESTIONS / ASSUMPTIONS

**Resolved before writing (verified):**
- Every IA page loads a single `/system/tokens.neutral.css` link → the swap point. ✓
- saulera's SEMANTIC MAP overrides **every** contract token (`comm` diff empty) → no silent neutral-fallback under the saulera shot. ✓
- The 6 IA pages have **no `<img>`, no `prefers-color-scheme`, no view-time `Date`** → no image/scheme/time flakiness. ✓ (greps clean)
- `portfolio.js` has **no scroll-reveal/opacity animation**; `.to-top` starts hidden → full-page load-time capture is stable. ✓
- `site.js` chrome injection is synchronous, no network/timers → deterministic once run; wait on `.site-header`/`.site-footer`. ✓
- `fonts/` dir **absent** → saulera fonts fall back (deterministic on Linux; honesty-noted). ✓
- Current Playwright stable = **1.61.1**; local Node = v20.20.2. ✓

**Assumptions (flag if wrong):**
- **Scope = 6 IA pages × 2 packs (12 baselines) for v1.** Stability > coverage for a first gate. Extending the `PAGES` array + re-baselining is trivial.
- **Client pack = saulera** (the committed reference pack) rather than a synthetic override pack — a real brand is portfolio evidence; scaffolding reads as scaffolding. **Caveat:** saulera's currency vs the contract is **not gated by anything**, so it could drift over time; if a future contract token is added and saulera doesn't set it, the saulera shot silently shows the neutral fallback there (deterministic, but a subtly-wrong baseline). Acceptable for now; note it.
- **Docker available locally** for baseline (re)generation. If a contributor lacks Docker, they rely on CI to (re)baseline. (Baselines are only *regenerated* deliberately, so this is rare.)

**Flag for the user (decide before/at execution):**
- **★ Proto pages are the thesis centerpiece** (data-connected prototype = the platform's headline demo) yet are **excluded from v1** for stability. **This decision also sets the PR closure keyword** (see Related Work): 6-page v1 → `Closes #9`; pull proto pages in → `Part of #9` until they land. Confirm the deferral is acceptable, or elevate `proto/verdant` + `proto/fieldwork` into v1 with a settle strategy: **stop/disable the Worker** so they deterministically hit the committed fixture fallback (`system/scenario-data.mjs`), block the network at the Playwright layer, and wait for the settled `#source` indicator + the rendered rows before capture. This adds real per-page complexity — hence the recommended deferral — but it's the most valuable follow-up.
- **`derive`/`agentic`/`trace`**: if they render **synchronously from committed data** with no network/time, they're nearly free to add to `PAGES`; if any awaits derivation/replay, defer with the proto pages. A 5-minute check at implementation time decides (add to v1 only if a two-consecutive-run Docker compare is byte-stable).
- **Single workflow vs. two:** this plan adds a `visual` job to `verify.yml`. Alternative: a separate `.github/workflows/visual.yml`. One workflow keeps "all gates in one place" and one PR status surface — recommended; flag only if you prefer isolation.

## NOTES (open canvas)

**Why route interception for the pack swap (vs. `addStyleTag` or a modified copy).**
- *Chosen — `page.route('**/tokens.neutral.css', r => r.fulfill({ path: saulera }))`.* Most faithful model of the platform's core claim ("re-skin = swap the one pack file"): the page requests neutral, gets saulera's bytes at the same URL, and the inner `@import` resolves relative to `/system/` correctly. Zero shipped-page edits. A technical reader sees the one-line re-skin executed literally.
- *Rejected — `addStyleTag({ path: saulera })` appended after neutral.* Works via source-order override, but loads **both** packs (neutral primitives linger), and an injected sheet's `@import` may resolve relative to the page, not `/system/`. Less faithful, slightly muddier.
- *Rejected — serve a query-param / harness-swapped copy.* Requires page or server scaffolding; violates "shipped pages stay vanilla."

**Why `@playwright/test`'s `toHaveScreenshot` (vs. `playwright-core` + `pixelmatch`/`pngjs`).** The runner gives baseline management, per-name storage, pixel-diff, a diff PNG, and an HTML report for free — the exact AC ("baselines committed; intentional change shows a diff") is its built-in behaviour. Hand-rolling would add 2–3 deps and ~80 lines of diff/baseline plumbing for strictly less. The ticket sanctions Playwright as factory tooling, so "fewer deps" doesn't argue for the hand-roll here.

**Deviation from the AC's "runnable locally as plain Node scripts."** Gates 1–2 are literally zero-dep `node tooling/X.mjs`. A browser gate cannot be — Playwright is inherently dep-heavy and needs a browser binary. Ticket #9's **per-ticket context explicitly names Playwright as factory tooling (unrestricted)**, so the generic "plain Node script" phrasing predates the browser reality. The honest local invocation is `npm test` / the Docker compare in `tooling/visual-regression/`, consistent with how Style Dictionary runs via its own npm script — not a regression from the ethos, an instance of it. Called out here and in the PR so it isn't read as drift.

**Cross-platform determinism — the load-bearing decision (mirrors the drift-check plan's Docker approach).** Screenshot rendering differs across OS/font stacks; committing a macOS baseline and comparing on Linux CI would fail for platform reasons, not real regressions. The fix, and the reason this gate is Medium not Low: **generate and compare baselines only inside `mcr.microsoft.com/playwright:v1.61.1-jammy`** — locally via `docker run`, in CI via `container:` at the **same tag**. The platform-agnostic `snapshotPathTemplate` keeps a single legible baseline set; the tradeoff (a bare macOS `playwright test` fails vs the Linux baseline) is intentional — it fails *loudly* rather than silently regenerating a wrong baseline, and the update path is always the Docker script. This is the single biggest first-run risk; a two-consecutive-run identical compare inside the image is the empirical check that closes it (do this before committing baselines).

**Hermeticity via blanket external-abort.** `route.abort()` on any non-`127.0.0.1` host is cheaper than enumerating beacons and also neutralizes: `analytics.mjs`'s CF Web Analytics beacon (no fake pageviews sent), any future external asset, and it keeps the run fully offline (CI-friendly). saulera's `/fonts/fonts.css` is `127.0.0.1` → allowed through → 404 by `serve.mjs` → fonts fall back. Clean.

**Baseline PNG git-weight.** 12 full-page PNGs (~150–500 KB each → ~2–5 MB) are committed and **don't delta-compress** on re-baseline (a new PNG replaces the old blob wholesale). Acceptable for a repo that commits its artifacts as proof; named here so it's a known cost, not a surprise. Keeping v1 to 6 pages also keeps this in check.

**Empirical validation — the whole gate was built and run during planning (this is why confidence is 9.5, not 8).** A full Docker spike (`mcr.microsoft.com/playwright:v1.61.1-jammy`, 2026-07-18) exercised every load-bearing assumption. What it proved and what it forced into the spec:
- **Version↔image handshake works** — `npm ci @playwright/test@1.61.1` inside `v1.61.1-jammy` → `npx playwright test` runs against the baked-in browsers. ✓
- **All 6 IA pages render fully** (chrome injected, no broken layout); the tiny zero-dep `serve.mjs` + route-swap + external-abort all worked first try. ✓
- **The re-skin lands on every page** — each `-saulera` capture differs from its `-neutral` pair in both hash and dimensions (saulera is consistently ~4–8% taller from its larger type scale). Pack swap genuinely re-skins; a silent no-op is ruled out. ✓
- **Noise floor = 0 px** — after the fixes below, two independent Docker compares at `maxDiffPixels:0, maxDiffPixelRatio:0` both passed 12/12, and a 5-run stress was 5/5 green. Hence the tight `maxDiffPixels: 100` (pure host-AA insurance). ✓
- **Positive control works** — changing `--color-accent` failed exactly the 6 neutral pages (~12k px diff) while the 6 saulera pages passed (saulera sets its own accent) — proving both "intentional change → diff" AND that the swap fully overrides. ✓
- **The one real instability, found and fixed.** The naive `fullPage: true` version flaked intermittently (~1 in 4 runs) on the single tallest page (`approach`, ~7400–7989px): "Failed to take two consecutive stable screenshots", height wobbling ±2px. Root-caused in two layers — Chromium's non-deterministic `text-wrap: balance` re-solving on the fullPage viewport resize, and `body { min-height: 100vh }` (components.css:35) re-resolving `100vh` against the content-height viewport. Normalizing both helped but did **not** fully settle it (fullPage stitching itself wobbles a ~8000px capture). The decisive fix: **abandon fullPage stitching — measure the content height, set an exact integer viewport, take one single-frame capture.** That removed the nondeterminism at the root (5/5 green, floor 0) and is ~2× faster (no stitching). The spec ships all three (normalize text-wrap, normalize min-height, integer-viewport single frame); each is a no-op on the real pages so no baseline pixel changes — they only make capture deterministic.
- **Residual −0.5 (why not 10):** GitHub's hosted `ubuntu-latest` runs the *same* image, so rendering should match the local spike byte-for-byte — but it's a different host and hasn't been observed yet; the `maxDiffPixels: 100` cushion exists for exactly that. And the reference implementation lives in the working tree uncommitted (not yet on `feature/visual-regression-gate` / not yet green on a real PR run).

**Route-ordering correctness.** Playwright runs route handlers **last-registered-first**. `beforeEach` registers the blanket block; the per-test pack swap registers **after** it, so for the neutral URL the swap fires first (fulfill terminates); every other URL falls through to the block (local→continue, external→abort). If a future refactor moves the swap into `beforeEach`, preserve this order.

## AMENDMENTS

- 2026-07-18 — created. (Gate 3/3 of ticket #9; the deferred follow-up forward-referenced by `.claude/plans/ci-verification-gates.md`.)
- 2026-07-18 — post-write advisor pass, three folds: (1) **verified `verify.yml` is on `origin/main`** (PR #31 merged today, `feature/ci-verification-gates` integrated) → the "branch from `main`" + "UPDATE `verify.yml`" instructions are confirmed correct as written. (2) **Threshold**: replaced the blanket `maxDiffPixelRatio: 0.01` with `maxDiffPixels: 200` as a *placeholder to tune from the Phase-2 two-run noise floor* — a full-page 1% ratio can hide small regressions and undercut the gate's core claim. (3) **Closure made conditional** on the proto-page scope decision (`Closes #9` for the 6-page v1 default; `Part of #9` if proto pages are pulled in and remain pending) — wired through Related Work, the PR task, the AC, and the Open-Questions flag.
- 2026-07-18 — **empirical validation spike (confidence 8 → 9.5).** Built the full harness (`tooling/visual-regression/`) and ran it end-to-end in the pinned Docker image. Confirmed the version↔image handshake, full render of all 6 pages, the re-skin landing on every page, a 0-px noise floor, and the positive control. **Found + fixed a real flake:** naive `fullPage: true` wobbled the tallest page ±2px (~1/4 runs) — root-caused to `text-wrap: balance` + `body{min-height:100vh}` re-solving on the fullPage viewport resize, and to fullPage stitching itself. Spec updated to (a) normalize `text-wrap`→`wrap` and `min-height`→0 (both no-ops on the real pages), and (b) **replace `fullPage` with a single-frame integer-viewport capture** → 5/5 stress runs green, floor 0. Threshold finalized at `maxDiffPixels: 100` (measured floor 0; 100 = host-AA insurance). Config/spec code sketches, GOTCHAs, and NOTES §"Empirical validation" updated to match the validated implementation. A reproducible reference implementation now exists in the working tree (uncommitted).
