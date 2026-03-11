const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'https://localhost:3000',
    trace: 'retain-on-failure',
    headless: true,
    ignoreHTTPSErrors: true,  // Allow self-signed certificates
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer disabled - start npm start manually before running tests
  // webServer: {
  //   command: 'npm start',
  //   url: 'http://localhost:3000/health',
  //   reuseExistingServer: false,
  //   timeout: 30_000,
  // },
});
