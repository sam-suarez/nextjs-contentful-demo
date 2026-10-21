// R17: login -> Set B visible -> logout (STATE.md P04 qa row), D-018 (`next` round trip).
// Playwright, JS enabled (javaScriptEnabled: true, the project default).
import { expect, test } from "@playwright/test";

const SLUG = "forest-friends-activity-cube";
const DETAIL_PATH = `/products/${SLUG}`;

test("R17: login from a members-only product redirect reveals Set B pricing, logout hides it again", async ({
  page,
}) => {
  // Visiting a Set B product with no session redirects to /login?next=<encoded detail path>.
  await page.goto(DETAIL_PATH);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=(%2Fproducts%2F${SLUG}|${DETAIL_PATH.replace(/\//g, "\\/")})$`));

  // Any non-empty username/password is accepted (architecture.md Auth).
  await page.getByPlaceholder("demo").fill("playwright-user");
  await page.getByPlaceholder("Any password").fill("playwright-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // The post-login redirect lands back on the originally requested product, now showing
  // the member price and the Members-only badge.
  await expect(page).toHaveURL(new RegExp(`${DETAIL_PATH}$`));
  await expect(page.getByText("Member price", { exact: true })).toBeVisible();
  await expect(page.getByText("$71.20", { exact: true })).toBeVisible();
  await expect(page.getByText("Members only", { exact: true })).toBeVisible();

  // Signing out returns to / and drops the session: Set B content disappears again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("Signed in as")).toHaveCount(0);
  await expect(page.getByText("Forest Friends Activity Cube")).toHaveCount(0);
});
