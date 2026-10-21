// P05 R12 (no-JS) and R13 (project scoping): runs only in the "chromium-no-js" project
// (javaScriptEnabled: false). The layout options are real links; prices stay visible.
// Written from handoffs/phase-05/spec.md, mock data only (logged out, name order).
import { expect, test, type Page } from "@playwright/test";

// Logged-out catalog, name order (src/data/products.mock.json, P03 spec table).
const PUBLIC_EVERYDAY = ["$14.00", "$28.00", "$16.00", "$12.00", "$24.00", "$32.00", "$11.00", "$9.00"];
const PRICE = "Price first";
const SPECS = "Specs first";

function option(page: Page, text: string) {
  return page.locator("a").filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
}

function pathAndSearch(page: Page) {
  const u = new URL(page.url());
  return u.pathname + u.search;
}

async function firstCardLabelMinusH2(page: Page) {
  const card = page.locator("article").first();
  const label = await card.getByText("Everyday price", { exact: true }).boundingBox();
  const h2 = await card.locator("h2").first().boundingBox();
  if (!label || !h2) throw new Error("first card price label or <h2> not rendered");
  return label.y - h2.y;
}

async function expectAllPricesVisible(page: Page) {
  const cards = page.locator("article");
  await expect(cards).toHaveCount(PUBLIC_EVERYDAY.length);
  for (let i = 0; i < PUBLIC_EVERYDAY.length; i++) {
    const card = cards.nth(i);
    await expect(card.getByText("Everyday price", { exact: true })).toBeVisible();
    await expect(card.getByText(PUBLIC_EVERYDAY[i]).first()).toBeVisible();
  }
}

async function expectSpecsLayoutNoJs(page: Page) {
  await expect(page.locator("[data-layout]")).toHaveCount(1);
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "specs");
  await expect(option(page, SPECS)).toHaveAttribute("aria-current", "true");
  await expect(option(page, PRICE)).not.toHaveAttribute("aria-current");
  // No island ran: link semantics only (R5).
  await expect(option(page, SPECS)).not.toHaveAttribute("aria-pressed");
  await expect(option(page, PRICE)).not.toHaveAttribute("aria-pressed");
  await expectAllPricesVisible(page);
  expect(await firstCardLabelMinusH2(page), "price label below <h2> in specs layout").toBeGreaterThan(0);
}

test("R13: this file runs in the chromium-no-js project with JavaScript disabled", async ({}, testInfo) => {
  expect(testInfo.project.name).toBe("chromium-no-js");
  expect(testInfo.project.use.javaScriptEnabled).toBe(false);
});

test("R12: no-JS /?layout=specs renders the specs layout with Specs first current and every price visible", async ({
  page,
}) => {
  await page.goto("/?layout=specs");
  await expectSpecsLayoutNoJs(page);
});

test("R12: no-JS / shows the price layout with every price visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-layout]")).toHaveAttribute("data-layout", "price");
  await expect(option(page, PRICE)).toHaveAttribute("aria-current", "true");
  await expectAllPricesVisible(page);
});

test("R12: no-JS clicking Specs first on / navigates via the real link to /?layout=specs", async ({ page }) => {
  await page.goto("/");
  await expect(option(page, SPECS)).toHaveAttribute("href", "/?layout=specs");
  await Promise.all([page.waitForURL((u) => u.pathname + u.search === "/?layout=specs"), option(page, SPECS).click()]);
  expect(pathAndSearch(page)).toBe("/?layout=specs");
  await expectSpecsLayoutNoJs(page);
});
