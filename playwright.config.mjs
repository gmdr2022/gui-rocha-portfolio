import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PORTAL_BASE_URL || "http://127.0.0.1:4174";

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results/artifacts",
  timeout: 45_000,
  expect: {
    timeout: 7_500,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "test-results/report" }]]
    : "line",
  use: {
    baseURL,
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: process.env.PORTAL_BASE_URL
    ? undefined
    : {
        command: "npm run build && node scripts/serve.mjs --port 4174",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
