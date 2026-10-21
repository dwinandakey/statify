/**
 * Playwright config for the real-browser integration tests IT-01..IT-05 (Statify running via `npm run dev`).
 * Run from `frontend/`:  npx playwright test --config components/Modals/Analyze/Classify/naive-bayes/text_analytics_eval/integration/browser/playwright.config.ts
 * Env: STATIFY_URL (default http://localhost:3000), HEADED=1 to watch the browser.
 */
import { defineConfig } from '@playwright/test';
import path from 'node:path';

const HERE = path.resolve(__dirname);

export default defineConfig({
  testDir: HERE,
  testMatch: /.*\.spec\.ts$/,
  outputDir: path.join(HERE, 'test-results'),
  timeout: 30 * 60_000,
  expect: { timeout: 60_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: path.join(HERE, 'logs', 'playwright_report.json') }]],
  use: {
    channel: 'chrome',
    baseURL: process.env.STATIFY_URL ?? 'http://localhost:3000',
    headless: process.env.HEADED !== '1',
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
    actionTimeout: 60_000,
    navigationTimeout: 180_000,
    screenshot: 'only-on-failure',
    // Tracing is OFF on purpose: with trace snapshots enabled the Statify page never finished hydrating (menus dead, no data grid).
    trace: 'off',
  },
});
