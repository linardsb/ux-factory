// tooling/visual-regression/visual.spec.mjs — CI visual-regression gate (epic #1, ticket #9, gate 3/3).
// Screenshots nine shipped pages — the six IA pages, the /roundtrip deep viewer, and the two
// data-connected proto pages (verdant, fieldwork) — under the neutral pack + one client pack
// (saulera, applied by swapping the single
// tokens.neutral.css link), pixel-diffed vs committed baselines. Proto pages render from the mock
// Worker, degrading to committed static fixtures; the gate blocks the Worker so they deterministically
// hit that fixture fallback. Playwright is factory tooling (ticket #9), isolated here — never a
// shipped-page dependency.
import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Six IA pages (chrome injected by site.js after load) + two proto pages (data-connected; settle on the
// static-fixture fallback + rendered rows). `rows` names a data-bound selector proving fixtures rendered.
const PAGES = [
  // waitReady: spine.mjs (#72) runs a transient live re-skin on load; it sets data-spine="ready"
  // on #beat-hero only AFTER the derived palette has fully reverted to the committed pack — wait so
  // the capture cannot race (and silently baseline) the branded flush. Set in a finally on every
  // path (reduced-motion, success, derive failure), so a JS context always resolves it; a spine.mjs
  // that fails to load hangs to timeout and fails LOUD — the intended never-baseline-a-broken-hero.
  { name: 'index',           url: '/index.html',           kind: 'ia', waitReady: '#beat-hero[data-spine="ready"]' },
  // waitReady: the annotated-source exhibit renders after an async fetch and sets
  // [data-asrc="ready"] only on success — wait so the paint can't race the capture, and a
  // broken artifact fails loudly instead of baselining an empty exhibit.
  { name: 'approach',        url: '/approach.html',        kind: 'ia', waitReady: '#asrc[data-asrc="ready"]' },
  // waitReady (v3 evidence home, #78): the live wizard is gone, so #reskin-preview[data-reskin] is
  // dropped — nothing sets it now and it would hang the gate forever. The three evidence engines each
  // mount AFTER an async fetch and set their [data-*="ready"] handle on success: the trace player
  // (#agents-player), the round-trip diff (#roundtrip-diff), the system graph (#system-graph). They
  // live inside the tabbed viewer's panels, which JS `hidden`s when inactive; the waitFor below uses
  // state:'attached', which a hidden-but-attached panel satisfies, so readiness is unchanged. The
  // baseline captures the default (Traces) tab active, the other two panels hidden. (#80 moved the
  // proto embeds off this page to Work, so factory no longer masks anything.)
  { name: 'factory',         url: '/factory.html',         kind: 'ia', waitReady: ['#agents-player[data-trace="ready"]', '#roundtrip-diff[data-diff="ready"]', '#system-graph[data-graph="ready"]'] },
  { name: 'roundtrip',       url: '/roundtrip.html',       kind: 'ia', waitReady: ['#roundtrip-diff[data-diff="ready"]', '#roundtrip-player[data-trace="ready"]'] },
  // Work (#80) now embeds the two proto pages in iframes (fixed-height boxes). Their content loads
  // async and the ia branch doesn't wait for frames, so mask the iframe boxes — deterministic
  // regardless of load state. Zero coverage loss: verdant + fieldwork are screenshotted standalone
  // below. Mask only the VISIBLE proto figures (:not([hidden])) — masking a display:none iframe has
  // no box to paint; both figures show here, so both are masked. (#10 slice 10.1, relocated by #80)
  { name: 'work',            url: '/work.html',            kind: 'ia', mask: '.factory-embed-figure:not([hidden]) .factory-embed' },
  { name: 'contact',         url: '/contact.html',         kind: 'ia' },
  { name: '404',             url: '/404.html',             kind: 'ia' },
  { name: 'proto-verdant',   url: '/proto/verdant.html',   kind: 'proto', rows: '.vd-plant-card' },
  { name: 'proto-fieldwork', url: '/proto/fieldwork.html', kind: 'proto', rows: '.fw-lane' },
];
const PACKS = { neutral: null, saulera: path.join(REPO, 'system/tokens.saulera.css') };

test.beforeEach(async ({ page }) => {
  // Hermeticity: allow only the local static server (127.0.0.1:4757); abort everything else. This
  // aborts the analytics beacon, any external asset, AND the mock Worker (127.0.0.1:8787) — so the
  // proto pages deterministically fall back to the committed static fixtures (source: "static"),
  // regardless of whether a Worker happens to be running. saulera's missing /fonts/fonts.css stays
  // on :4757 → 404 → fonts fall back deterministically. No-op for the IA pages (they never hit :8787).
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    return u.hostname === '127.0.0.1' && u.port === '4757' ? route.continue() : route.abort();
  });
});

for (const [pack, packPath] of Object.entries(PACKS)) {
  for (const p of PAGES) {
    test(`${p.name} · ${pack}`, async ({ page }) => {
      // Registered AFTER beforeEach → runs first for the neutral URL (last-registered-first):
      // the re-skin = swap the one pack file, executed literally. Every other URL falls through
      // to the beforeEach gate (local :4757 → continue, everything else → abort).
      if (packPath) await page.route('**/system/tokens.neutral.css', (route) => route.fulfill({ path: packPath }));
      await page.goto(p.url, { waitUntil: 'load' });
      if (p.kind === 'ia') {
        await page.waitForSelector('.site-header'); // site.js injects chrome after load
        await page.waitForSelector('.site-footer');
      } else {
        // Worker (:8787) aborted above → the static fallback settles #source to "static" (set
        // synchronously just before render). Both waits also fail loudly if the data DIDN'T load:
        // the catch-branch never sets data-source, so a wrong-fallback baseline can't be produced.
        await page.waitForSelector('#source[data-source="static"]');
        await page.waitForSelector(p.rows);
      }
      // waitReady (factory only): the async intake module sets [data-reskin] and the async trace mount
      // sets [data-trace="ready"] — wait for every listed selector so neither can race the capture.
      // A string or an array of selectors is accepted. (#10, slices 10.2 + 10.3)
      if (p.waitReady) {
        for (const sel of (Array.isArray(p.waitReady) ? p.waitReady : [p.waitReady]))
          await page.locator(sel).first().waitFor({ state: 'attached' });
      }
      await page.evaluate(() => document.fonts.ready);
      // Capture-normalization (makes the capture deterministic; zero visual cost — see below). Both
      // still matter with the integer-viewport capture used at the end: setViewportSize also resizes,
      // which would re-trigger the same two nondeterminisms:
      //  1. text-wrap: balance/pretty → greedy `wrap`. The balancer is non-deterministic by design
      //     (Chromium re-solves it whenever the viewport resizes).
      //  2. body min-height:100vh → 0. `100vh` re-resolves against the resized viewport, rounding the
      //     tallest page ±2px. It's a no-op at normal viewport anyway (every page's content already
      //     exceeds 100vh), so removing it changes no baseline pixel — it only kills the resize wobble.
      // Both preserve every other visual property, so real regressions are still caught. (#9, gate 3/3)
      await page.addStyleTag({ content: '*, *::before, *::after { text-wrap: wrap !important; } html, body { min-height: 0 !important; }' });
      // Proto phone screen sizes to min(800px, 80dvh) — the one viewport-height dependency across the
      // eight pages. A tall viewport pins it at its 800px cap so it stops depending on height, making
      // the measure→resize→capture flow below stable. Verdant's content (800px phone + head + footer)
      // is always > 1000px, so the cap still holds after we resize down to the exact content height.
      // IA pages and fieldwork have no dvh sizing, so this pre-resize is a no-op for them.
      if (p.kind === 'proto') await page.setViewportSize({ width: 1280, height: 1600 });
      // Capture the whole page as ONE frame at an exact integer viewport = content height, rather than
      // Playwright's fullPage auto-resize stitching — which wobbles ±2px on the ~8000px page and can't
      // take "two consecutive stable screenshots". A fixed integer viewport removes that nondeterminism.
      const h = await page.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().height));
      await page.setViewportSize({ width: 1280, height: h });
      // p.mask (factory only): paint a solid box over the embed iframes so their async content can't
      // move the baseline. A locator matching multiple elements masks them all. (#10, slice 10.1)
      const shotOpts = p.mask ? { mask: [page.locator(p.mask)] } : {};
      await expect(page).toHaveScreenshot(`${p.name}-${pack}.png`, shotOpts);
    });
  }
}
