import { defineConfig, devices } from '@playwright/test';

const chromiumOpts = {
  browserName: 'chromium',
  channel: undefined,
  launchOptions: {
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  },
  colorScheme: 'dark',
};

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'iphone-14',
      use: { ...devices['iPhone 14'], ...chromiumOpts },
    },
    {
      name: 'iphone-15',
      use: { ...devices['iPhone 15'], ...chromiumOpts },
    },
  ],
});
