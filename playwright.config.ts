import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1600, height: 1100 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHROME_CHANNEL,
        viewport: { width: 1600, height: 1100 },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1600, height: 1100 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          "node scripts/prepare-pdfjs.mjs && node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
