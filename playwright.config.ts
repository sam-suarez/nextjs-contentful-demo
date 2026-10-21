// End-to-end checks (Playwright). Starts its own `npm start` against the already-built
// app with mock data forced, the same env pattern as scripts/verify-ssr.sh (D-021,
// architecture.md Tests): CONTENTFUL_* blanked, own SESSION_SECRET.
//
// P05 R13 (D-009): two projects, scoped by file name.
//   chromium        JS enabled, runs every spec except `*.nojs.spec.ts`
//   chromium-no-js  javaScriptEnabled: false, runs only `*.nojs.spec.ts`
import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3220";
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /\.nojs\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-no-js",
      testMatch: /\.nojs\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
    },
  ],
  webServer: {
    command: `npm start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      CONTENTFUL_SPACE_ID: "",
      CONTENTFUL_ENVIRONMENT: "",
      CONTENTFUL_DELIVERY_TOKEN: "",
      SESSION_SECRET: "playwright-e2e-session-secret-at-least-32-chars-long",
    },
  },
});
