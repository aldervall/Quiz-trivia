const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'https://127.0.0.1:3000',  // Use IPv4 explicitly (avoid IPv6 issues)
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
  // Note: Start server manually with `npm start` in another terminal
  // WebServer is disabled due to issues with HTTPS self-signed certificate validation.
  // To run tests:
  //   Terminal 1: npm start
  //   Terminal 2: npm run test:e2e
  // webServer: {
  //   command: 'npm start',
  //   url: 'https://localhost:3000/health',
  //   reuseExistingServer: true,
  //   timeout: 60_000,
  // },
});
