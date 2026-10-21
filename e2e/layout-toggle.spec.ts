// P05 layout toggle island, JS enabled (project "chromium").
// R7 hydrated semantics, R8 instant toggle (no navigation, no refetch, replaceState),
// R9 other params kept, R10 URL is the source of truth, R13 project scoping.
// Written from handoffs/phase-05/spec.md (Requirements + Contract), mock data only.
import { expect, test, type Page, type Request } from "@playwright/test";

const PRICE = "Price first";
const SPECS = "Specs first";

/** The option `<a>` with exactly this text (role may be link or button, so match the tag). */
function option(page: Page, text: string) {
  return page.locator("a").filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
}

/** The grid wrapper: the one element carrying `data-layout`. */
function grid(page: Page) {
  return page.locator("[data-layout]");
}

/** Path + search of the current URL, e.g. "/?layout=specs". */
function pathAndSearch(page: Page) {
  const u = new URL(page.url());
  return u.pathname + u.search;
}

/** The island has mounted once `aria-pressed` appears on both options (R7). */
async function waitForIsland(page: Page) {
  await expect(option(page, PRICE)).toHaveAttribute("aria-pressed", /^(true|false)$/);
  await expect(option(page, SPECS)).toHaveAttribute("aria-pressed", /^(true|false)$/);
}

async function expectLayout(page: Page, layout: "price" | "specs") {
  await expect(grid(page)).toHaveCount(1);
  await expect(grid(page)).toHaveAttribute("data-layout", layout);
  await expect(option(page, PRICE)).toHaveAttribute("aria-pressed", layout === "price" ? "true" : "false");
  await expect(option(page, SPECS)).toHaveAttribute("aria-pressed", layout === "specs" ? "true" : "false");
}

async function expectPath(page: Page, path: string) {
  await expect.poll(() => pathAndSearch(page)).toBe(path);
}

/** Vertical position of the first card's price label minus its <h2> (negative = label above). */
async function firstCardLabelMinusH2(page: Page) {
  const card = page.locator("article").first();
  const label = await card.getByText("Everyday price", { exact: true }).boundingBox();
  const h2 = await card.locator("h2").first().boundingBox();
  if (!label || !h2) throw new Error("first card price label or <h2> not rendered");
  return label.y - h2.y;
}

/** Records non-prefetch RSC requests (header `rsc: 1`, no `next-router-prefetch`). */
function recordRscRequests(page: Page) {
  const seen: string[] = [];
  const pending: Promise<void>[] = [];
  const onRequest = (req: Request) => {
    pending.push(
      req.allHeaders().then((h) => {
        if (h["rsc"] === "1" && !("next-router-prefetch" in h)) seen.push(req.url());
      }),
    );
  };
  page.on("request", onRequest);
  return {
    async stop() {
      page.off("request", onRequest);
      await Promise.all(pending);
      return seen;
    },
  };
}

/** Wraps history.replaceState/pushState before any app script runs, to record their URL args. */
async function spyOnHistory(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __qaReplace: string[]; __qaPush: string[] };
    w.__qaReplace = [];
    w.__qaPush = [];
    const replace = history.replaceState.bind(history);
    const push = history.pushState.bind(history);
    history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
      if (url != null) w.__qaReplace.push(String(url));
      return replace(data, unused, url);
    };
    history.pushState = (data: unknown, unused: string, url?: string | URL | null) => {
      if (url != null) w.__qaPush.push(String(url));
      return push(data, unused, url);
    };
  });
}

async function resetHistorySpy(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __qaReplace: string[]; __qaPush: string[] };
    w.__qaReplace = [];
    w.__qaPush = [];
  });
}

async function historySpy(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as { __qaReplace: string[]; __qaPush: string[] };
    const norm = (s: string) => {
      const u = new URL(s, location.href);
      return u.pathname + u.search;
    };
    return { replace: w.__qaReplace.map(norm), push: w.__qaPush.map(norm) };
  });
}

async function setMarker(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: string }).__qaMarker = "still-here";
  });
}

async function markerSurvives(page: Page) {
  return page.evaluate(() => (window as unknown as { __qaMarker?: string }).__qaMarker === "still-here");
}

test("R13: this file runs in the JS-enabled chromium project", async ({}, testInfo) => {
  expect(testInfo.project.name).toBe("chromium");
  expect(testInfo.project.use.javaScriptEnabled).not.toBe(false);
});

test("R7: after hydration on / both options are <a> with role=button, aria-pressed and no aria-current", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /hydrat|react error #(418|423|425)/i.test(msg.text())) hydrationErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    if (/hydrat|react error #(418|423|425)/i.test(err.message)) hydrationErrors.push(err.message);
  });

  await page.goto("/");
  await waitForIsland(page);

  const price = option(page, PRICE);
  const specs = option(page, SPECS);
  await expect(price).toHaveCount(1);
  await expect(specs).toHaveCount(1);
  await expect(price).toHaveAttribute("href", "/");
  await expect(specs).toHaveAttribute("href", "/?layout=specs");
  await expect(price).toHaveAttribute("role", "button");
  await expect(specs).toHaveAttribute("role", "button");
  await expect(price).toHaveAttribute("aria-pressed", "true");
  await expect(specs).toHaveAttribute("aria-pressed", "false");
  await expect(price).not.toHaveAttribute("aria-current");
  await expect(specs).not.toHaveAttribute("aria-current");

  await page.waitForLoadState("networkidle");
  expect(hydrationErrors, "no hydration mismatch").toEqual([]);
});

test("R7: after hydration on /?layout=specs Specs first is pressed and Price first is not", async ({ page }) => {
  await page.goto("/?layout=specs");
  await waitForIsland(page);
  await expect(option(page, PRICE)).toHaveAttribute("href", "/");
  await expect(option(page, SPECS)).toHaveAttribute("href", "/?layout=specs");
  await expect(option(page, PRICE)).toHaveAttribute("role", "button");
  await expect(option(page, SPECS)).toHaveAttribute("role", "button");
  await expectLayout(page, "specs");
  await expect(option(page, PRICE)).not.toHaveAttribute("aria-current");
  await expect(option(page, SPECS)).not.toHaveAttribute("aria-current");
});

test("R8: clicking Specs first switches the grid in place, moves the price below the <h2> and replaces the URL", async ({
  page,
}) => {
  await spyOnHistory(page);
  await page.goto("/");
  await waitForIsland(page);
  await page.waitForLoadState("networkidle");
  await expectLayout(page, "price");
  expect(await firstCardLabelMinusH2(page), "price label above <h2> in price layout").toBeLessThan(0);

  const historyLength = await page.evaluate(() => history.length);
  await setMarker(page);
  await resetHistorySpy(page);
  const rsc = recordRscRequests(page);

  await option(page, SPECS).click();

  await expectLayout(page, "specs");
  await expectPath(page, "/?layout=specs");
  await expect.poll(() => firstCardLabelMinusH2(page), { message: "price label below <h2> in specs layout" }).toBeGreaterThan(0);

  await page.waitForTimeout(500);
  expect(await markerSurvives(page), "no document load").toBe(true);
  expect(await page.evaluate(() => history.length), "replaceState, not pushState").toBe(historyLength);
  const spy = await historySpy(page);
  expect(spy.replace, "history.replaceState called with hrefs.specs").toContain("/?layout=specs");
  expect(spy.push, "no pushState").toEqual([]);
  expect(await rsc.stop(), "no non-prefetch RSC request").toEqual([]);
});

test("R8: clicking Price first after Specs first reverses the switch and the URL becomes /", async ({ page }) => {
  await spyOnHistory(page);
  await page.goto("/");
  await waitForIsland(page);
  await page.waitForLoadState("networkidle");
  await setMarker(page);
  const rsc = recordRscRequests(page);

  await option(page, SPECS).click();
  await expectLayout(page, "specs");
  await expectPath(page, "/?layout=specs");

  await resetHistorySpy(page);
  await option(page, PRICE).click();
  await expectLayout(page, "price");
  await expectPath(page, "/");
  await expect.poll(() => firstCardLabelMinusH2(page), { message: "price label back above <h2>" }).toBeLessThan(0);

  await page.waitForTimeout(500);
  expect(await markerSurvives(page), "no document load").toBe(true);
  const spy = await historySpy(page);
  expect(spy.replace, "history.replaceState called with hrefs.price").toContain("/");
  expect(spy.push, "no pushState").toEqual([]);
  expect(await rsc.stop(), "no non-prefetch RSC request").toEqual([]);
});

test("R8: clicking the already-active option changes nothing", async ({ page }) => {
  await page.goto("/");
  await waitForIsland(page);
  await page.waitForLoadState("networkidle");
  await setMarker(page);
  const rsc = recordRscRequests(page);

  await option(page, PRICE).click();
  await page.waitForTimeout(500);

  await expectLayout(page, "price");
  await expectPath(page, "/");
  expect(await firstCardLabelMinusH2(page)).toBeLessThan(0);
  expect(await markerSurvives(page), "no document load").toBe(true);
  expect(await rsc.stop(), "no non-prefetch RSC request").toEqual([]);
});

test("R9: on /?q=washable toggling to specs gives /?q=washable&layout=specs", async ({ page }) => {
  await page.goto("/?q=washable");
  await waitForIsland(page);
  await expect(option(page, SPECS)).toHaveAttribute("href", "/?q=washable&layout=specs");
  await setMarker(page);

  await option(page, SPECS).click();
  await expectLayout(page, "specs");
  await expectPath(page, "/?q=washable&layout=specs");
  expect(await markerSurvives(page), "no document load").toBe(true);
});

test("R9: on /?category=bath toggling to specs gives /?category=bath&layout=specs", async ({ page }) => {
  await page.goto("/?category=bath");
  await waitForIsland(page);
  await expect(option(page, SPECS)).toHaveAttribute("href", "/?category=bath&layout=specs");
  await setMarker(page);

  await option(page, SPECS).click();
  await expectLayout(page, "specs");
  await expectPath(page, "/?category=bath&layout=specs");
  expect(await markerSurvives(page), "no document load").toBe(true);
});

test("R10: after toggling to specs on /, following the Bath chip lands on /?category=bath with the price layout", async ({
  page,
}) => {
  await page.goto("/");
  await waitForIsland(page);
  await option(page, SPECS).click();
  await expectLayout(page, "specs");
  await expectPath(page, "/?layout=specs");

  await page.getByRole("link", { name: "Bath", exact: true }).click();
  await expectPath(page, "/?category=bath");
  await expect(page.locator("article")).toHaveCount(2);
  await expectLayout(page, "price");
});

test("R10: after toggling to price on /?layout=specs, following the Bath chip lands on its specs URL with the specs layout", async ({
  page,
}) => {
  await page.goto("/?layout=specs");
  await waitForIsland(page);
  await option(page, PRICE).click();
  await expectLayout(page, "price");
  await expectPath(page, "/");

  // The chip keeps its server href from before the toggle (spec Contract decisions).
  await page.getByRole("link", { name: "Bath", exact: true }).click();
  await expectPath(page, "/?category=bath&layout=specs");
  await expect(page.locator("article")).toHaveCount(2);
  await expectLayout(page, "specs");
});
