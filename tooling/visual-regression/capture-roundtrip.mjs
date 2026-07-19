// tooling/visual-regression/capture-roundtrip.mjs — one-time round-trip vision capture
// (epic #38, ticket #40). NOT a CI script. Re-uses the visual-regression gate's re-skin
// mechanism (visual.spec.mjs L52) + zero-dep static server (serve.mjs) to render proto/verdant.html
// under the Verdant pack and screenshot the phone screen → tooling/round-trip/input/. That PNG is
// the vision input the recorded derivation run reads. Deliberately NOT added to visual.spec's PACKS
// (that would mint new CI baselines — churn + cost); this capture is authoring-time, its PNG committed.
//   cd tooling/visual-regression && node capture-roundtrip.mjs

import './serve.mjs'; // side-effect: boots the :4757 static server rooting the repo
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const PACK = join(REPO, 'system', 'tokens.verdant.css');
const OUT_DIR = join(REPO, 'tooling', 'round-trip', 'input');
const BASE = 'http://127.0.0.1:4757';

async function waitServer(url, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* not up yet */ }
    if (Date.now() - t0 > ms) throw new Error(`static server did not answer at ${url} within ${ms}ms`);
    await new Promise((r) => setTimeout(r, 150));
  }
}

mkdirSync(OUT_DIR, { recursive: true });
await waitServer(`${BASE}/index.html`);

const browser = await chromium.launch();
// A tall viewport pins the proto phone screen at its 800px cap (visual.spec.mjs L83); scale 2 = crisp
// vision input.
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 }, deviceScaleFactor: 2 });

// Hermetic (visual.spec.mjs L40): allow only :4757, abort everything else — so the proto settles on
// its committed static fixtures (source: "static"). Registered FIRST so the specific re-skin route
// below (registered second → tried first) wins for the pack file.
await page.route('**/*', (route) => {
  const u = new URL(route.request().url());
  return u.hostname === '127.0.0.1' && u.port === '4757' ? route.continue() : route.abort();
});
// Re-skin: swap the one neutral pack link for the Verdant pack (visual.spec.mjs L52).
await page.route('**/system/tokens.neutral.css', (route) => route.fulfill({ path: PACK }));

await page.goto(`${BASE}/proto/verdant.html`, { waitUntil: 'load' });
await page.waitForSelector('#source[data-source="static"]'); // fixture fallback settled
await page.waitForSelector('.vd-plant-card');                 // plant rows rendered
await page.evaluate(() => document.fonts.ready);

// The phone screen alone (clean vision input) + the full page (context).
await page.locator('.proto-frame-phone').screenshot({ path: join(OUT_DIR, 'verdant-plant-overview.png') });
await page.screenshot({ path: join(OUT_DIR, 'verdant-full.png'), fullPage: true });

await browser.close();
console.log(`capture-roundtrip ✓  proto/verdant.html re-skinned with system/tokens.verdant.css → ${OUT_DIR}`);
console.log('  verdant-plant-overview.png (phone screen) · verdant-full.png (full page)');
process.exit(0);
