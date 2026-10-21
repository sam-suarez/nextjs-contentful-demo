// R17: login -> Set B visible -> logout (STATE.md P04 qa row), D-018 (`next` round trip).
// Phase 04-fix1 R12: the redirect now comes from src/proxy.ts (D-032), and the post-login check
// is anchored to the URL pathname, so `/login?next=/products/<slug>` can no longer satisfy it.
// Phase 04-fix2 R11 (OI-2, D-034): sign-out is a form POST to /logout, a full page load; after it,
// with no reload, nothing of the members-only page is left anywhere in the DOM.
// Playwright, JS enabled (javaScriptEnabled: true, the project default).
import { expect, test } from "@playwright/test";

const SLUG = "forest-friends-activity-cube";
const DETAIL_PATH = `/products/${SLUG}`;

test("R11 (04-fix2), R12 (04-fix1), P04 R17: login from a members-only redirect reveals Set B pricing; sign-out is a full page load that leaves no Set B in the DOM", async ({
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

  // Phase 04-fix2 R11 (OI-2, D-034): Sign out is a native form POST to /logout answered with
  // 303 to /, i.e. a full document load. The previous members-only page must not survive anywhere
  // in the DOM (not even in a hidden <Activity>), so the checks below are whole-DOM, no reload.
  // A marker on the old window: a full page load gives a fresh window, so the marker is gone.
  await page.evaluate(() => {
    (window as unknown as { __beforeSignOut?: boolean }).__beforeSignOut = true;
  });
  const logoutRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/logout" &&
      request.isNavigationRequest() &&
      request.resourceType() === "document",
    { timeout: 10_000 },
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  // A POST document (navigation) request to /logout happens.
  await logoutRequest;
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await page.waitForLoadState("load");
  expect(new URL(page.url()).pathname).toBe("/");
  // The tab now holds a new document (full page load), not the client-routed old one.
  expect(
    await page.evaluate(() => (window as unknown as { __beforeSignOut?: boolean }).__beforeSignOut),
  ).toBeUndefined();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  // Whole DOM, hidden elements included, no reload.
  await expect(page.getByText("Forest Friends Activity Cube")).toHaveCount(0);
  await expect(page.getByText("Signed in as")).toHaveCount(0);
  await expect(page.getByText("Member price", { exact: true })).toHaveCount(0);
  await expect(page.getByText("$71.20", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign out", includeHidden: true })).toHaveCount(0);
  // Serialized DOM (includes hidden subtrees and inline payload): no Set B name, no session UI.
  const html = await page.content();
  expect(html).not.toContain("Forest Friends Activity Cube");
  expect(html).not.toContain("Signed in as");
  // The session itself is gone, not just hidden: no `session` cookie is left in the browser.
  expect((await page.context().cookies()).some((cookie) => cookie.name === "session")).toBe(false);
});
