import { defineConfig, devices } from '@playwright/test';

// Puerto propio para no reutilizar por accidente otro servidor local en el 3000.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
const STUB_API_PORT = Number(process.env.STUB_API_PORT ?? 5199);
const STUB_API_URL = `http://localhost:${STUB_API_PORT}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: process.env.CI ? `pnpm start --port ${PORT}` : `pnpm dev --webpack --port ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // Las páginas públicas piden el directorio desde el servidor de Next: van al stub.
      env: { API_INTERNAL_URL: STUB_API_URL },
    },
    {
      command: `node tests/support/stub-api-server.mjs`,
      url: `${STUB_API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      env: { STUB_API_PORT: String(STUB_API_PORT) },
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
