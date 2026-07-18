// tooling/visual-regression/playwright.config.mjs — CI visual-regression gate (epic #1, ticket #9, gate 3/3).
// One chromium project; webServer runs the zero-dep serve.mjs; platform-agnostic single baseline set;
// determinism knobs (fixed viewport, light scheme, reduced motion, animations frozen).
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}', // platform-agnostic: ONE baseline set
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4757',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  // Measured noise floor = 0 px across independent runs in this pinned image (planning spike,
  // 2026-07-18), given the spec's single-frame integer-viewport capture + normalizations. 100 is
  // generous host-AA insurance for GitHub's runner — ~4 orders of magnitude below any real
  // regression (a token/layout change moves 10⁴–10⁶ px; the accent positive-control moved ~12k+).
  expect: { toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 100 } },
  webServer: {
    command: 'node serve.mjs',
    url: 'http://127.0.0.1:4757/index.html',
    reuseExistingServer: !process.env.CI,
    env: { PORT: '4757' },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
