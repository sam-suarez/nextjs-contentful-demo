// R2 / R16 (spec.md, Amendments round 3): with JS enabled, an unknown slug and a slug
// that fails SLUG_PATTERN both show the route-level not-found screen. Playwright, JS
// enabled (the project default).
import { expect, test, type Page } from "@playwright/test";

async function expectNotFoundScreen(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "We can't find that toy", exact: true })).toBeVisible();
  await expect(page.getByText("404", { exact: true })).toBeVisible();
  await expect(page.getByText("It may have been renamed or put back in the toy box.", { exact: true })).toBeVisible();
  // Minimal header link + primary button, both to "/".
  const back = page.getByRole("link", { name: "Back to catalog", exact: true });
  await expect(back).toHaveCount(2);
  for (const link of await back.all()) {
    await expect(link).toHaveAttribute("href", "/");
  }
}

test("R2/R16: /products/no-such-toy shows the not-found screen", async ({ page }) => {
  await page.goto("/products/no-such-toy");
  await expectNotFoundScreen(page);
});

test("R2/R16: a slug that fails SLUG_PATTERN shows the not-found screen", async ({ page }) => {
  await page.goto("/products/Not-Valid-Slug");
  await expectNotFoundScreen(page);
});
