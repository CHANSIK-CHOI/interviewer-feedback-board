import { defineConfig } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;
const shouldStartWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER !== "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  ...(shouldStartWebServer
    ? {
        webServer: {
          command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
