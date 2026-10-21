// R17: login -> Set B visible -> logout (STATE.md P04 qa row), D-018 (`next` round trip).
// Phase 04-fix1 R12: the redirect now comes from src/proxy.ts (D-032), and the post-login check
// is anchored to the URL pathname, so `/login?next=/products/<slug>` can no longer satisfy it.
// Playwright, JS enabled (javaScriptEnabled: true, the project default).
import { expect, test } from "@playwright/test";

const SLUG = "forest-friends-activity-cube";
const DETAIL_PATH = `/products/${SLUG}`;

test("R12 (P04 R17): login from a members-only product redirect reveals Set B pricing, logout hides it again", async ({
  page,
}) => {
  // Visiting a Set B product with no session redirects to /login?next=<encoded detail path>.
  await page.goto(DETAIL_PATH);
  // Pathname /login with exactly one param, next, decoding to the detail path (either encoding).
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/login" &&
      [...url.searchParams.keys()].join(",") === "next" &&
      url.searchParams.get("next") === DETAIL_PATH,
  );

  // Any non-empty username/password is accepted (architecture.md Auth).
  await page.getByPlaceholder("demo").fill("playwright-user");
  await page.getByPlaceholder("Any password").fill("playwright-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // The post-login redirect lands back on the originally requested product, now showing
  // the member price and the Members-only badge.
  // R12: anchored to the pathname, not a suffix match on the whole URL.
  await expect(page).toHaveURL((url) => url.pathname === DETAIL_PATH);
  // The product page has rendered and the URL is still the product (a transient match while the
  // browser passes through the product URL on its way elsewhere does not count).
  await expect(page.getByRole("heading", { level: 1, name: "Forest Friends Activity Cube" })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(DETAIL_PATH);
  await expect(page.getByText("Member price", { exact: true })).toBeVisible();
  await expect(page.getByText("$71.20", { exact: true })).toBeVisible();
  await expect(page.getByText("Members only", { exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(DETAIL_PATH);

  // Signing out returns to / and drops the session: Set B content disappears again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  // Phase 04-fix1 dispute: with cacheComponents on, Next keeps the previous route mounted under a
  // hidden <Activity> (display: none) after client navigation, so whole-DOM counts would match
  // content the visitor cannot see. The bundled docs say to be explicit about visibility
  // (01-app/02-guides/preserving-ui-state.md, Testing). What the visitor sees on / must be the
  // logged-out state.
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText("Signed in as").filter({ visible: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await expect(page.getByText("Forest Friends Activity Cube").filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText("Member price", { exact: true }).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByText("$71.20", { exact: true }).filter({ visible: true })).toHaveCount(0);
  // The session itself is gone, not just hidden: no `session` cookie is left in the browser.
  expect((await page.context().cookies()).some((cookie) => cookie.name === "session")).toBe(false);
  // A fresh server response for / (a new document, so no hidden route is kept) carries no
  // session UI and no Set B content anywhere in the DOM.
  await page.reload();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByText("Signed in as")).toHaveCount(0);
  await expect(page.getByText("Forest Friends Activity Cube")).toHaveCount(0);
  await expect(page.getByText("$71.20", { exact: true })).toHaveCount(0);
});
