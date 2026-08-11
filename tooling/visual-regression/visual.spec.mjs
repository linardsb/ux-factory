// tooling/visual-regression/visual.spec.mjs — CI visual-regression gate (epic #1, ticket #9, gate 3/3).
// Screenshots eleven shipped pages — the six IA pages, the /roundtrip deep viewer, /build (the
// off-nav pattern builder, linked in by #138), /components (the catalog, #215), and the two
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
  // NO waitVisible SINCE #216, and that is a property of the page rather than a simplification:
  // home has ZERO activateOn:'visible' beats left. The one it had was the built-screen peak (#75,
  // the #105 fix), and #216 compressed home to the gate and deleted system/peak.mjs with it —
  // spine.mjs:199's 'load'-registered beat-hero is now the only registerBeat call on this page.
  // Leaving the old handle here would DEADLOCK the gate to timeout on both packs, because
  // #beat-peak no longer exists; adding a new one for the brand beat would deadlock the same way.
  // With the key absent, index leaves the bounded post-resize re-measure loop through the existing
  // `if (p.waitVisible)` guard below — the same path contact and 404 take.
  { name: 'index',           url: '/index.html',           kind: 'ia', waitReady: '#beat-hero[data-spine="ready"]' },
  // waitReady: the annotated-source exhibit renders after an async fetch and sets
  // [data-asrc="ready"] only on success — wait so the paint can't race the capture, and a
  // broken artifact fails loudly instead of baselining an empty exhibit.
  { name: 'approach',        url: '/approach.html',        kind: 'ia', waitReady: '#asrc[data-asrc="ready"]' },
  // waitReady (#206, the studio): the three evidence engines this entry used to wait on — the trace
  // player, the round-trip diff and the system graph — NO LONGER MOUNT AT LOAD. They are inspector
  // panels now, imported and rendered on first activation, so at rest none of the three has fetched
  // or rendered anything and all three of the old handles would hang the gate forever. system/
  // studio.mjs's own handle replaces them: one selector, set in a `finally` on every path (a missing
  // shell, a missing canvas, a throw), so a JS context always resolves it and the gate fails on the
  // missing thing rather than deadlocking to timeout.
  //
  // WHAT MOVED WITH IT, stated because it is a real trade and not a free simplification. The old
  // three-handle wait doubled as a liveness check on the generated artifacts: a broken
  // system-graph.json hung this gate. It cannot any more, because the graph is not mounted at
  // capture. Two things replace it, and between them they are arguably stronger — CI `verify`'s
  // drift-check reads the ARTIFACT rather than its rendering, and tooling/studio-journey.mjs's
  // /factory pass activates all three panels and asserts each one actually rendered. The remaining
  // fail-loud property for a broken PAGE rests on initGlossary running before studio.mjs's `try`
  // (studio.mjs's mountStudio says why): an unknown data-term key throws before the finally, the
  // handle is never set, and this wait hangs.
  //
  // waitReady and deliberately NOT waitVisible: the studio mounts at load with no
  // IntersectionObserver gate, so waitVisible would drag it into the bounded re-measure loop below
  // for no reason — the same argument :66-77 makes for the two proto pages.
  //
  // TWO HANDLES SINCE #209, and the second is the load-bearing one. [data-studio="ready"] fires at
  // MOUNT — and the canvas is EMPTY at mount now, because system/replay-driver.mjs fills it by
  // playing a committed real run over ~14 s. So the at-rest state this page is baselined in is
  // AUTOPLAY-TO-COMPLETION: the run's finished board (4 places · 7 affordances · 7 connections), its
  // chrome, and the "This build" panel counted from it. Waiting on the mount handle alone would
  // screenshot a blank canvas.
  //
  // Still waitReady and deliberately NOT waitVisible for BOTH: the studio mounts and the replay
  // starts at load with no IntersectionObserver gate, so waitVisible would drag them into the
  // bounded re-measure loop below for nothing.
  //
  // Deterministic by construction — build-questions.mjs's store is in-memory with its board
  // initialising absent, so a cold load always plays the same committed artifact, and the driver's
  // pure layer is gated for determinism by build-checks group 16.
  //
  // `timeout` because the replay costs 14 s of this test's budget on top of load, fonts and two
  // captures, and Playwright's per-test default is 30 s. It is a PAGE property, not a global one, so
  // it lives on the page rather than in the config — and it moves with replay-driver.mjs's
  // PLAYBACK_MS, which says so.
  { name: 'factory',         url: '/factory.html',         kind: 'ia', timeout: 90_000,
    waitReady: ['[data-studio="ready"]', '[data-replay="settled"]'] },
  { name: 'roundtrip',       url: '/roundtrip.html',       kind: 'ia', waitReady: ['#roundtrip-diff[data-diff="ready"]', '#roundtrip-player[data-trace="ready"]'] },
  // Work (#80) now embeds the two proto pages in iframes (fixed-height boxes). Their content loads
  // async and the ia branch doesn't wait for frames, so mask the iframe boxes — deterministic
  // regardless of load state. Zero coverage loss: verdant + fieldwork are screenshotted standalone
  // below. Mask only the VISIBLE proto figures (:not([hidden])) — masking a display:none iframe has
  // no box to paint; both figures show here, so both are masked. (#10 slice 10.1, relocated by #80)
  { name: 'work',            url: '/work.html',            kind: 'ia', mask: '.factory-embed-figure:not([hidden]) .factory-embed' },
  { name: 'contact',         url: '/contact.html',         kind: 'ia' },
  { name: '404',             url: '/404.html',             kind: 'ia' },
  // /build (#138): ten view-time modules, five of which set a settled-state handle at load — the
  // import, the two wizard mounts (listed once; the loop below takes .first(), and a one-mount
  // regression is build-checks' job, not this gate's), the verdict panel, the breadboard and the
  // keep rail. [data-pattern-stage="ready"] is deliberately NOT among them: pattern-render.mjs:185
  // returns before setting the handle while the vocabulary is still loading, and loadVocab() sits
  // behind an IntersectionObserver (rootMargin: 800px) that cannot fire until the final resize
  // reveals the page — put it in waitReady and the gate deadlocks to timeout. It is waitVisible,
  // the same shape #105 needed for the home peak.
  { name: 'build',           url: '/build.html',           kind: 'ia',
    waitReady: ['[data-build-import="ready"]', '[data-build-questions="ready"]', '[data-build-verdict="ready"]',
                '[data-breadboard="ready"]', '[data-build-keep="ready"]'],
    waitVisible: '[data-pattern-stage="ready"]' },
  // /components (#215): system/catalog.mjs fetches pack + vocabulary + system-graph at load and
  // sets data-catalog="ready" on the root ONLY after a successful render (approach's asrc idiom) —
  // a broken artifact hangs this gate loudly instead of baselining an empty catalog. waitReady and
  // deliberately NOT waitVisible: everything renders at load, no IntersectionObserver-gated beat.
  // The live token-value cells make the two pack baselines differ — that is the point; the
  // pack-swap MutationObserver never fires at rest (pack-boot's guaranteed no-op default).
  { name: 'components',      url: '/components.html',      kind: 'ia', waitReady: '[data-catalog-root][data-catalog="ready"]' },
  // #176: BOTH proto pages now paint at-rest chrome that arrives after load, and the proto branch
  // below waits only on DATA (#source, `rows`) — neither of those waits covers it. Verdant's resize
  // handle and width readout are injected by a dynamic import() of device-frame.mjs, which also
  // wraps the phone in .proto-device and so reflows the stage; Fieldwork's two slot control rows sit
  // behind an async vocabulary + composition fetch. Easy to under-fix by only handling Fieldwork:
  // Verdant's WIDTH is CSS-owned and looks static, but its handle is exactly as late as Fieldwork's
  // rows. Without these handles the height measured at :129 can be stale and the capture silently
  // truncates or omits the new chrome — the #138 defect class, and one that compares cleanly against
  // itself forever. waitReady and deliberately NOT waitVisible: both arrive at load rather than at
  // the reveal resize, and waitReady is applied at :104, before fonts.ready and before the first
  // measure, which is where this wait belongs. waitVisible would drag these two into the bounded
  // re-measure loop and change their capture flow for no reason.
  { name: 'proto-verdant',   url: '/proto/verdant.html',   kind: 'proto', rows: '.vd-plant-card',
    waitReady: '[data-device-frame="ready"]' },
  { name: 'proto-fieldwork', url: '/proto/fieldwork.html', kind: 'proto', rows: '.fw-lane',
    waitReady: '[data-bus-toggles="ready"]' },
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
      // A page whose at-rest state costs real time to reach says so on its own entry (#209's
      // /factory replay). Everything else keeps the config's 30 s default.
      if (p.timeout) test.setTimeout(p.timeout);
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
      const measure = () => page.evaluate(() => Math.ceil(document.documentElement.getBoundingClientRect().height));
      let h = await measure();
      await page.setViewportSize({ width: 1280, height: h });
      // waitVisible (index + build, #105): the resize above is what first reveals the whole page, so any
      // activateOn:'visible' beat starts its work HERE. Wait for its settled handle before capturing,
      // or the shot races the assembly. Deliberately after the resize — see the PAGES note.
      if (p.waitVisible) {
        await page.locator(p.waitVisible).first().waitFor({ state: 'attached' });
        // ...and then MEASURE AGAIN (#138). The height above was taken before that beat rendered its
        // content, and toHaveScreenshot without fullPage captures the VIEWPORT — so everything the
        // beat adds after the resize falls outside the frame and is silently dropped. This was live:
        // the site footer had never been inside index-{neutral,saulera}.png since #105 introduced
        // waitVisible, and nothing caught it because a baseline shorter than its page still compares
        // cleanly against itself. Measured while planning #138 on macOS Chromium 149: index grew
        // ~585px and build ~257px after their beats settled. Those are evidence of the CLASS of
        // defect, NOT expected dimensions — this pinned Linux container renders different absolute
        // heights, so a future reader must not read a different number here as a regression.
        // Bounded loop, not one pass: a resize re-triggers layout, so the second measurement is only
        // correct if it is a fixpoint. Exhausting the loop THROWS rather than capturing anyway —
        // exiting without a fixpoint means the viewport was last sized from a stale measurement,
        // which is the same silent truncation this block exists to remove, and it would truncate
        // identically on the capture and the comparison run, so the gate would stay green while
        // hiding the page's tail. Measured in the pinned container while writing this: both
        // waitVisible pages reach the fixpoint on the SECOND measurement, so a bound of 6 leaves
        // four spare passes — a throw means something structural, not a page one pass short of the
        // margin. The absolute heights are deliberately NOT recorded here: they move with any
        // content edit to either page, nothing would enforce them, and the run that produced them is
        // in this commit. Guarded by `if (p.waitVisible)` so the eight pages without a
        // visible-activated beat keep a byte-identical flow and cannot churn.
        const PASSES = 6;
        let converged = false;
        for (let i = 0; i < PASSES; i += 1) {
          const settled = await measure();
          if (settled === h) { converged = true; break; }
          h = settled;
          await page.setViewportSize({ width: 1280, height: h });
        }
        if (!converged) {
          // Both numbers, and no claim about which way they differ: the loop exits having just
          // resized, so a re-measure can read equal (one pass short) or larger (still growing), and
          // the fix differs. Only a fixpoint makes the capture safe, so neither reading is green.
          throw new Error(`${p.name}-${pack}: page height reached no fixpoint within ${PASSES} passes `
            + `— viewport ${h}px, document ${await measure()}px. Capturing outside a fixpoint truncates `
            + `the page silently, and identically on the capture and comparison runs.`);
        }
      }
      // p.mask (factory only): paint a solid box over the embed iframes so their async content can't
      // move the baseline. A locator matching multiple elements masks them all. (#10, slice 10.1)
      const shotOpts = p.mask ? { mask: [page.locator(p.mask)] } : {};
      await expect(page).toHaveScreenshot(`${p.name}-${pack}.png`, shotOpts);
    });
  }
}
