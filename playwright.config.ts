// End-to-end checks (Playwright). Starts its own `npm start` against the already-built
// app with mock data forced, the same env pattern as scripts/verify-ssr.sh (D-021,
// architecture.md Tests): CONTENTFUL_* blanked, own SESSION_SECRET.
//
// One project, JavaScript enabled (P05 R13). P07 R12 (D-031): the `chromium-no-js` project and
// `e2e/layout-toggle.nojs.spec.ts` are removed; without JavaScript, streamed content shows only
// its skeleton, and that is accepted.
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
      use: { ...devices["Desktop Chrome"] },
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
