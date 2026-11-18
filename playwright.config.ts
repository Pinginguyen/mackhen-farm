import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: '.env.local' });
dotenv.config();

const baseURL = process.env.E2E_BASE_URL || process.env.AUDIT_BASE_URL || 'http://localhost:3000';
const target = new URL(baseURL);
const localTarget = ['localhost', '127.0.0.1', '::1'].includes(target.hostname);
const startLocalServer = localTarget && process.env.PLAYWRIGHT_START_SERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  ...(startLocalServer ? {
    webServer: {
      command: `npm run dev -- --hostname ${target.hostname} --port ${target.port || '3000'}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  } : {}),
});