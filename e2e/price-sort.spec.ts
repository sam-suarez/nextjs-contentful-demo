// P12 price sort island, JS enabled (project "chromium").
// R6 hydrated semantics, R8 placement, R9 URL as the source of truth, R10 instant reorder
// (preventDefault, replaceState, no document or RSC request; active / modified clicks),
// R11 reorder through React (same DOM nodes, cards stay direct grid children), R14 the
// contract's orders signed out and in.
// Written from handoffs/phase-12/spec.md (Requirements + Contract), mock data only.
// P12-fix1 (pop-in order after a client sort, R1 to R6) is appended at the end of the file.
import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";
import { SignJWT } from "jose";
import config from "../playwright.config";

const ASC = "Low to high";
const DESC = "High to low";
const PRICE_FIRST = "Price first";

// Contract, "Expected data" (card names as rendered in <h2>).
const NAME_ORDER_OUT = [
  "Bubble Bath Whale",
  "Cloud Bunny Plush",
  "Jingle Ball Trio",
  "Ocean Wave Rattle",
  "Rainbow Ring Stacker",
  "Shape Sorter Cube",
  "Starlight Teether Ring",
  "Sunny Duck Bath Squirter",
];
const ASC_OUT = [
  "Sunny Duck Bath Squirter",
  "Starlight Teether Ring",
  "Ocean Wave Rattle",
  "Bubble Bath Whale",
  "Jingle Ball Trio",
  "Rainbow Ring Stacker",
  "Cloud Bunny Plush",
  "Shape Sorter Cube",
];
const DESC_OUT = [...ASC_OUT].reverse();
const ASC_IN = [
  ...ASC_OUT,
  "Sensory Crinkle Book Set",
  "Heirloom Wooden Xylophone",
  "Moonbeam Musical Mobile",
  "Forest Friends Activity Cube",
];
const DESC_IN = [...ASC_IN].reverse();

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** The option `<a>` with exactly this text (role may be link or button, so match the tag). */
function option(page: Page, text: string) {
  return page.locator("a").filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });
}

function sortGroup(page: Page) {
  return page.locator('[role="group"][aria-labelledby="sort-label"]');
}

/** Card names in DOM order (the visible cards' <h2>s; hidden <Activity> pages are skipped). */
async function cardNames(page: Page): Promise<string[]> {
  return page
    .locator("article")
    .filter({ visible: true })
    .evaluateAll((articles) =>
      articles.map((a) => (a.querySelector("h2")?.textContent ?? "").trim()),
    );
}

async function expectCards(page: Page, names: string[]) {
  await expect.poll(() => cardNames(page)).toEqual(names);
}

function pathAndSearch(page: Page) {
  const u = new URL(page.url());
  return u.pathname + u.search;
}

async function expectPath(page: Page, path: string) {
  await expect.poll(() => pathAndSearch(page)).toBe(path);
}

/** The sort island has mounted once `aria-pressed` appears on both options (R6). */
async function waitForSortIsland(page: Page) {
  await expect(option(page, ASC)).toHaveAttribute("aria-pressed", /^(true|false)$/);
  await expect(option(page, DESC)).toHaveAttribute("aria-pressed", /^(true|false)$/);
}

async function expectPressed(page: Page, active: "asc" | "desc" | null) {
  await expect(option(page, ASC)).toHaveAttribute("aria-pressed", active === "asc" ? "true" : "false");
  await expect(option(page, DESC)).toHaveAttribute("aria-pressed", active === "desc" ? "true" : "false");
}

async function setMarker(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __qaMarker?: string }).__qaMarker = "still-here";
  });
}

async function markerSurvives(page: Page) {
  return page.evaluate(() => (window as unknown as { __qaMarker?: string }).__qaMarker === "still-here");
}

/** Records document requests and non-prefetch RSC requests (header `rsc: 1`) from now on. */
function recordRequests(page: Page) {
  const documents: string[] = [];
  const rsc: string[] = [];
  const pending: Promise<void>[] = [];
  const onRequest = (req: Request) => {
    if (req.resourceType() === "document") documents.push(req.url());
    pending.push(
      req.allHeaders().then((h) => {
        if (h["rsc"] === "1" && !("next-router-prefetch" in h)) rsc.push(req.url());
      }),
    );
  };
  page.on("request", onRequest);
  return {
    async stop() {
      page.off("request", onRequest);
      await Promise.all(pending);
      return { documents, rsc };
    },
  };
}

/**
 * Before any app script runs: records history.replaceState / pushState URLs, and installs
 * window-level (bubble phase, so after React's root listener) `click` / `auxclick` / `contextmenu` listeners
 * that record whether the event reached the window already default-prevented. With
 * `__qaBlockDefault` set, the window listener then prevents the default itself, so a modified
 * click the island correctly ignored does not open tabs or downloads during the test.
 */
async function installSpies(page: Page) {
  await page.addInitScript(() => {
    type Spy = {
      __qaReplace: string[];
      __qaPush: string[];
      __qaClicks: { type: string; prevented: boolean }[];
      __qaBlockDefault: boolean;
    };
    const w = window as unknown as Spy;
    w.__qaReplace = [];
    w.__qaPush = [];
    w.__qaClicks = [];
    w.__qaBlockDefault = false;
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
    for (const type of ["click", "auxclick", "contextmenu"]) {
      window.addEventListener(type, (e) => {
        const target = e.target as Element | null;
        if (!target?.closest?.('[role="group"][aria-labelledby="sort-label"]')) return;
        w.__qaClicks.push({ type, prevented: e.defaultPrevented });
        if (w.__qaBlockDefault) e.preventDefault();
      });
    }
  });
}

async function resetSpies(page: Page, blockDefault = false) {
  await page.evaluate((block) => {
    const w = window as unknown as {
      __qaReplace: string[];
      __qaPush: string[];
      __qaClicks: unknown[];
      __qaBlockDefault: boolean;
    };
    w.__qaReplace = [];
    w.__qaPush = [];
    w.__qaClicks = [];
    w.__qaBlockDefault = block;
  }, blockDefault);
}

async function readSpies(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as {
      __qaReplace: string[];
      __qaPush: string[];
      __qaClicks: { type: string; prevented: boolean }[];
    };
    const norm = (s: string) => {
      const u = new URL(s, location.href);
      return u.pathname + u.search;
    };
    return { replace: w.__qaReplace.map(norm), push: w.__qaPush.map(norm), clicks: w.__qaClicks };
  });
}

function sessionSecret(): string {
  const ws = config.webServer;
  const server = Array.isArray(ws) ? ws[0] : ws;
  const secret = server?.env?.SESSION_SECRET;
  if (!secret) throw new Error("playwright.config.ts webServer.env.SESSION_SECRET is not set");
  return secret;
}

async function addSessionCookie(context: BrowserContext, baseURL: string) {
  const token = await new SignJWT({ name: "playwright-price-sort" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(sessionSecret()));
  await context.addCookies([
    { name: "session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax", secure: false },
  ]);
}

/** Loads `path` at 1280x720 with spies installed, waits for the island and the network to settle. */
async function openCatalog(page: Page, path: string) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await installSpies(page);
  await page.goto(path);
  await waitForSortIsland(page);
  await page.waitForLoadState("networkidle");
}

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

test("P12 R6: after hydration on / both Price options are <a> with role=button and aria-pressed=false", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await expect(option(page, ASC)).toHaveCount(1);
  await expect(option(page, DESC)).toHaveCount(1);
  await expect(option(page, ASC)).toHaveAttribute("href", "/?sort=price-asc");
  await expect(option(page, DESC)).toHaveAttribute("href", "/?sort=price-desc");
  await expect(option(page, ASC)).toHaveAttribute("role", "button");
  await expect(option(page, DESC)).toHaveAttribute("role", "button");
  await expectPressed(page, null);
});

test("P12 R6/R9: after hydration on /?sort=price-desc High to low is pressed and the cards are in descending order", async ({
  page,
}) => {
  await openCatalog(page, "/?sort=price-desc");
  await expect(option(page, ASC)).toHaveAttribute("role", "button");
  await expect(option(page, DESC)).toHaveAttribute("role", "button");
  await expectPressed(page, "desc");
  await expectCards(page, DESC_OUT);
});

test("P12 R11: hydration keeps the server order and logs no hydration error (/ and /?sort=price-asc)", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /hydrat|react error #(418|423|425)/i.test(msg.text())) hydrationErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    if (/hydrat|react error #(418|423|425)/i.test(err.message)) hydrationErrors.push(err.message);
  });

  await openCatalog(page, "/");
  await expectCards(page, NAME_ORDER_OUT);
  await page.goto("/?sort=price-asc");
  await waitForSortIsland(page);
  await page.waitForLoadState("networkidle");
  await expectCards(page, ASC_OUT);
  expect(hydrationErrors, "no hydration mismatch").toEqual([]);
});

test("P12 R14/R10: signed out, Low to high reorders the cards in place, replaces the URL and makes no request", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await expectCards(page, NAME_ORDER_OUT);
  const historyLength = await page.evaluate(() => history.length);
  await setMarker(page);
  await resetSpies(page);
  const requests = recordRequests(page);

  await option(page, ASC).click();

  await expectCards(page, ASC_OUT);
  await expectPath(page, "/?sort=price-asc");
  await expectPressed(page, "asc");

  await page.waitForTimeout(500);
  expect(await markerSurvives(page), "no document load (window marker survives)").toBe(true);
  expect(await page.evaluate(() => history.length), "replaceState, not pushState").toBe(historyLength);
  const spies = await readSpies(page);
  expect(spies.replace, "history.replaceState called with the Low to high href").toContain("/?sort=price-asc");
  expect(spies.push, "no pushState").toEqual([]);
  expect(spies.clicks, "the plain click reached the window default-prevented").toEqual([
    { type: "click", prevented: true },
  ]);
  const { documents, rsc } = await requests.stop();
  expect(documents, "no document request").toEqual([]);
  expect(rsc, "no non-prefetch RSC request").toEqual([]);
});

test("P12 R14/R10: signed out, High to low after Low to high gives the exact reverse and /?sort=price-desc", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await setMarker(page);
  const requests = recordRequests(page);

  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);
  await expectPath(page, "/?sort=price-asc");

  await resetSpies(page);
  await option(page, DESC).click();
  await expectCards(page, DESC_OUT);
  await expectPath(page, "/?sort=price-desc");
  await expectPressed(page, "desc");

  await page.waitForTimeout(500);
  expect(await markerSurvives(page), "no document load (window marker survives)").toBe(true);
  const spies = await readSpies(page);
  expect(spies.replace, "history.replaceState called with the High to low href").toContain("/?sort=price-desc");
  expect(spies.push, "no pushState").toEqual([]);
  const { documents, rsc } = await requests.stop();
  expect(documents, "no document request").toEqual([]);
  expect(rsc, "no non-prefetch RSC request").toEqual([]);
});

test("P12 R14/R10: clicking the active High to low again changes nothing", async ({ page }) => {
  await openCatalog(page, "/");
  await option(page, DESC).click();
  await expectCards(page, DESC_OUT);
  await expectPath(page, "/?sort=price-desc");
  await expectPressed(page, "desc");

  await setMarker(page);
  await resetSpies(page);
  const requests = recordRequests(page);
  await option(page, DESC).click();
  await page.waitForTimeout(500);

  await expectCards(page, DESC_OUT);
  await expectPath(page, "/?sort=price-desc");
  await expectPressed(page, "desc");
  expect(await markerSurvives(page), "no document load (window marker survives)").toBe(true);
  const spies = await readSpies(page);
  expect(
    spies.replace.filter((u) => u !== "/?sort=price-desc"),
    "no replaceState to another URL",
  ).toEqual([]);
  expect(spies.push, "no pushState").toEqual([]);
  const { documents, rsc } = await requests.stop();
  expect(documents, "no document request").toEqual([]);
  expect(rsc, "no non-prefetch RSC request").toEqual([]);
});

test("P12 R10: clicking the server-active option on /?sort=price-asc changes nothing", async ({ page }) => {
  await openCatalog(page, "/?sort=price-asc");
  await expectCards(page, ASC_OUT);
  await setMarker(page);
  await resetSpies(page);
  const requests = recordRequests(page);

  await option(page, ASC).click();
  await page.waitForTimeout(500);

  await expectCards(page, ASC_OUT);
  await expectPath(page, "/?sort=price-asc");
  await expectPressed(page, "asc");
  expect(await markerSurvives(page), "no document load (window marker survives)").toBe(true);
  const { documents, rsc } = await requests.stop();
  expect(documents, "no document request").toEqual([]);
  expect(rsc, "no non-prefetch RSC request").toEqual([]);
});

const MODIFIED_CLICKS = [
  { label: "Meta", run: (page: Page) => option(page, ASC).click({ modifiers: ["Meta"] }), type: "click" },
  // On macOS, Chromium turns Ctrl+click into a secondary click: it fires `contextmenu` and no
  // `click`, so there the browser default to keep is the context menu (dispute, build round 1).
  {
    label: "Control",
    run: (page: Page) => option(page, ASC).click({ modifiers: ["Control"] }),
    type: process.platform === "darwin" ? "contextmenu" : "click",
  },
  { label: "Shift", run: (page: Page) => option(page, ASC).click({ modifiers: ["Shift"] }), type: "click" },
  { label: "Alt", run: (page: Page) => option(page, ASC).click({ modifiers: ["Alt"] }), type: "click" },
  { label: "middle button", run: (page: Page) => option(page, ASC).click({ button: "middle" }), type: "auxclick" },
] as const;

for (const mc of MODIFIED_CLICKS) {
  test(`P12 R10: a ${mc.label} click on Low to high keeps the browser default (not prevented, no reorder, URL unchanged)`, async ({
    page,
  }) => {
    await openCatalog(page, "/");
    await expectCards(page, NAME_ORDER_OUT);
    // The window listener prevents the default after recording, so no tab / download opens.
    await resetSpies(page, true);

    await mc.run(page);
    await page.waitForTimeout(500);

    const spies = await readSpies(page);
    const seen = spies.clicks.filter((c) => c.type === mc.type);
    expect(seen.length, `a ${mc.type} event reached the window`).toBeGreaterThan(0);
    expect(seen.every((c) => !c.prevented), "the island did not call preventDefault").toBe(true);
    await expectCards(page, NAME_ORDER_OUT);
    await expectPath(page, "/");
    await expectPressed(page, null);
    expect(spies.replace.filter((u) => u !== "/"), "no replaceState to another URL").toEqual([]);
  });
}

test("P12 R14: signed in, Low to high gives the 12-name ascending order with Set B included", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("baseURL is not configured");
  await addSessionCookie(context, baseURL);
  await openCatalog(page, "/");
  await expect(page.getByText("Member price", { exact: true }).first()).toBeVisible();
  await setMarker(page);
  const requests = recordRequests(page);

  await option(page, ASC).click();
  await expectCards(page, ASC_IN);
  await expectPath(page, "/?sort=price-asc");
  await expectPressed(page, "asc");

  await option(page, DESC).click();
  await expectCards(page, DESC_IN);
  await expectPath(page, "/?sort=price-desc");

  await page.waitForTimeout(500);
  expect(await markerSurvives(page), "no document load (window marker survives)").toBe(true);
  const { documents, rsc } = await requests.stop();
  expect(documents, "no document request").toEqual([]);
  expect(rsc, "no non-prefetch RSC request").toEqual([]);
});

test("P12 R11: a sort click moves the existing card DOM nodes, which stay direct children of the grid", async ({
  page,
}) => {
  await openCatalog(page, "/");

  // Tag every card root (the grid's direct child holding each <article>) and the grid itself.
  const before = await page.evaluate(() => {
    const articles = [...document.querySelectorAll("article")].filter((a) => a.checkVisibility());
    const grid = articles[0]?.parentElement;
    if (!grid) return { ok: false, reason: "no visible article" };
    const roots = articles.map((a) => {
      let el: Element = a;
      while (el.parentElement && el.parentElement !== grid) el = el.parentElement;
      return el;
    });
    const sameGrid = roots.every((r) => r.parentElement === grid);
    roots.forEach((r, i) => ((r as unknown as { __qaCard: string }).__qaCard = `card-${i}`));
    (grid as unknown as { __qaGrid: boolean }).__qaGrid = true;
    return {
      ok: sameGrid,
      reason: "",
      display: getComputedStyle(grid).display,
      children: grid.children.length,
      articles: articles.length,
    };
  });
  expect(before.ok, before.reason || "every card shares one parent").toBe(true);
  expect(before.children, "the grid's children are exactly the cards").toBe(before.articles);
  expect(before.display, "the cards' parent is the grid element itself").toMatch(/grid/);

  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);

  const after = await page.evaluate(() => {
    const articles = [...document.querySelectorAll("article")].filter((a) => a.checkVisibility());
    const grid = articles[0]?.parentElement;
    return {
      sameGrid: !!grid && (grid as unknown as { __qaGrid?: boolean }).__qaGrid === true,
      directChildren: articles.every((a) => a.parentElement === grid),
      children: grid?.children.length ?? 0,
      tags: articles.map((a) => (a as unknown as { __qaCard?: string }).__qaCard ?? null),
    };
  });
  expect(after.sameGrid, "the cards are still children of the same grid node").toBe(true);
  expect(after.directChildren, "every card is a direct child of the grid").toBe(true);
  expect(after.children, "no wrapper or extra node in the grid").toBe(before.articles);
  // Name order indices 7,6,3,0,2,4,1,5 (Contract R13 order for price-asc).
  expect(after.tags, "the same DOM nodes, moved into price order").toEqual(
    [7, 6, 3, 0, 2, 4, 1, 5].map((i) => `card-${i}`),
  );
});

test("P12 R11: after a sort click, Tab order follows the new card order", async ({ page }) => {
  await openCatalog(page, "/");
  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);

  // Each card links to its product page; their DOM (= sequential focus) order follows the sort.
  const linkOrder = await page.evaluate(() =>
    [...document.querySelectorAll("article")]
      .filter((a) => a.checkVisibility())
      .map((a) => {
        const link = a.querySelector("a[href^='/products/']") ?? a.closest("a[href^='/products/']");
        return link?.getAttribute("href") ?? null;
      }),
  );
  expect(linkOrder).toEqual([
    "/products/sunny-duck-bath-squirter",
    "/products/starlight-teether-ring",
    "/products/ocean-wave-rattle",
    "/products/bubble-bath-whale",
    "/products/jingle-ball-trio",
    "/products/rainbow-ring-stacker",
    "/products/cloud-bunny-plush",
    "/products/shape-sorter-cube",
  ]);
});

// --- R8: placement ----------------------------------------------------------------------------

async function box(page: Page, locator: ReturnType<Page["locator"]>, what: string) {
  const b = await locator.boundingBox();
  if (!b) throw new Error(`${what} is not rendered`);
  return b;
}

test("P12 R8: from md up (1280x720) the Price control sits to the left of Layout on the same row", async ({
  page,
}) => {
  await openCatalog(page, "/");
  const price = await box(page, sortGroup(page), "Price group");
  const priceFirst = await box(page, option(page, PRICE_FIRST), "Price first option");
  expect(price.x + price.width, "Price group ends left of the Layout options").toBeLessThanOrEqual(priceFirst.x);
  const overlap = Math.min(price.y + price.height, priceFirst.y + priceFirst.height) - Math.max(price.y, priceFirst.y);
  expect(overlap, "Price group and Layout options share a row").toBeGreaterThan(0);
  for (const text of [ASC, DESC]) {
    const b = await box(page, option(page, text), text);
    expect(b.height, `${text} is at least 48 px tall`).toBeGreaterThanOrEqual(48);
  }
});

for (const width of [375, 320]) {
  test(`P12 R8: below md (${width} px) the filter card stacks search, chips, Price, Layout, then count and Clear filters`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    await waitForSortIsland(page);
    await page.waitForLoadState("networkidle");

    const search = await box(page, page.locator('input[name="q"]').filter({ visible: true }), "search input");
    const chip = await box(page, page.getByRole("link", { name: "All", exact: true }).filter({ visible: true }), "All chip");
    const price = await box(page, sortGroup(page), "Price group");
    const layout = await box(page, option(page, PRICE_FIRST), "Price first option");
    const count = await box(page, page.getByText("8 toys", { exact: true }).filter({ visible: true }), "count");
    const clear = await box(page, page.getByRole("link", { name: "Clear filters" }).filter({ visible: true }), "Clear filters");

    expect(search.y, "search above chips").toBeLessThan(chip.y);
    expect(chip.y, "chips above Price").toBeLessThan(price.y);
    expect(price.y + price.height, "Price group ends above the Layout options").toBeLessThanOrEqual(layout.y);
    expect(layout.y, "Layout above the count").toBeLessThan(count.y);
    expect(layout.y, "Layout above Clear filters").toBeLessThan(clear.y);

    for (const text of [ASC, DESC]) {
      const b = await box(page, option(page, text), text);
      expect(b.height, `${text} is at least 48 px tall`).toBeGreaterThanOrEqual(48);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
  });
}

// =============================================================================================
// P12-fix1: pop-in order after a client sort.
// Written from handoffs/phase-12-fix1/spec.md (Requirements + Contract), mock data only.
// Card hook (Contract): the visible `article` elements in DOM order carry `.pop-in` and the
// inline `--i`; read through `style.getPropertyValue("--i")`, `getComputedStyle().animationDelay`
// and `getAnimations()`. A pop-in animation is a CSSAnimation whose name contains `pop-in`
// (R2 "one `pop-in` animation"; the Contract's example alternate keyframe is `pop-in-replay`).
// =============================================================================================

type FixAnim = { name: string; startTime: number | null; delay: number; isNew: boolean; playState: string };
type FixCard = { name: string; i: string; delay: string; anims: FixAnim[] };
type FixSample = { ok: boolean; t0: number; cards: FixCard[]; violations: string[] };

/**
 * Call right before a click: remembers every animation that exists now (so a restarted one is
 * recognisable as a new object) and the document timeline time `t0` of the click.
 */
async function armClick(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __qaT0: number; __qaBefore: WeakSet<Animation> };
    w.__qaBefore = new WeakSet();
    for (const a of document.getAnimations()) w.__qaBefore.add(a);
    w.__qaT0 = Number(document.timeline.currentTime);
  });
}

/**
 * Samples the visible cards every animation frame for up to `ms` after `armClick`.
 * - `restart` / `stagger`: stops at the first frame that meets R2 / R1 for `expected` and
 *   returns it; otherwise returns the last frame whose DOM order equals `expected` (or the last).
 * - `quiet`: samples the whole window and lists every frame's violation of "nothing restarted,
 *   `--i` unchanged" (R3) or "no animation started" (R5, `expectedI` null).
 */
async function sampleCards(
  page: Page,
  opts: { mode: "restart" | "stagger" | "quiet"; expected: string[]; expectedI?: string[] | null; ms?: number },
): Promise<FixSample> {
  return page.evaluate(async ({ mode, expected, expectedI, ms }) => {
    const w = window as unknown as { __qaT0: number; __qaBefore: WeakSet<Animation> };
    const t0 = w.__qaT0;
    const before = w.__qaBefore;
    // A composited animation's start time can resolve a fraction of a ms before the click's
    // timeline time; allow one frame. Identity (`isNew`) is what proves the restart.
    const FRAME = 20;
    const delayMs = (v: string) => {
      const s = v.split(",")[0].trim();
      return s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000;
    };
    const snap = (): FixCard[] =>
      [...document.querySelectorAll("article")]
        .filter((a) => a.checkVisibility())
        .map((a) => ({
          name: (a.querySelector("h2")?.textContent ?? "").trim(),
          i: a.style.getPropertyValue("--i").trim(),
          delay: getComputedStyle(a).animationDelay,
          anims: a
            .getAnimations()
            .filter((x): x is CSSAnimation => x instanceof CSSAnimation)
            .map((x) => ({
              name: x.animationName,
              startTime: x.startTime == null ? null : Number(x.startTime),
              delay: Number(x.effect?.getTiming().delay ?? 0),
              isNew: !before.has(x),
              playState: x.playState,
            })),
        }));
    const sameOrder = (cards: FixCard[]) =>
      cards.length === expected.length && cards.every((c, k) => c.name === expected[k]);
    const restarted = (c: FixCard) => {
      const pops = c.anims.filter((x) => x.name.includes("pop-in"));
      return pops.length === 1 && pops[0].isNew && pops[0].startTime != null && pops[0].startTime >= t0 - FRAME;
    };
    const staggered = (c: FixCard, k: number) =>
      c.i === String(k) && Math.round(delayMs(c.delay)) === k * 40;
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

    const end = performance.now() + ms;
    let lastOrdered: FixCard[] | null = null;
    let last: FixCard[] = [];
    const violations: string[] = [];
    while (performance.now() < end) {
      await frame();
      const cards = snap();
      last = cards;
      if (mode === "quiet") {
        const at = Math.round(Number(document.timeline.currentTime) - t0);
        if (!sameOrder(cards)) violations.push(`+${at}ms order ${cards.map((c) => c.name).join(" | ")}`);
        cards.forEach((c, k) => {
          if (expectedI && c.i !== expectedI[k]) violations.push(`+${at}ms ${c.name}: --i ${c.i} (was ${expectedI[k]})`);
          for (const x of c.anims) {
            if (x.isNew || x.startTime == null || x.startTime >= t0 - FRAME)
              violations.push(`+${at}ms ${c.name}: animation ${x.name} started after the click (${x.playState})`);
          }
        });
        continue;
      }
      if (!sameOrder(cards)) continue;
      lastOrdered = cards;
      const ok = mode === "restart" ? cards.every(restarted) : cards.every(staggered);
      if (ok) return { ok: true, t0, cards, violations };
    }
    return { ok: mode === "quiet" && violations.length === 0, t0, cards: lastOrdered ?? last, violations: [...new Set(violations)].slice(0, 20) };
  }, { mode: opts.mode, expected: opts.expected, expectedI: opts.expectedI ?? null, ms: opts.ms ?? 2000 });
}

/** Waits until no visible card has a running or pending CSS animation (the pop-in has played out). */
async function waitForCardAnimationsToSettle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll("article")]
            .filter((a) => a.checkVisibility())
            .flatMap((a) => a.getAnimations())
            .filter((x) => x instanceof CSSAnimation && (x.playState === "running" || x.pending)).length,
        ),
      { timeout: 5000 },
    )
    .toBe(0);
}

async function cardIs(page: Page): Promise<string[]> {
  return page
    .locator("article")
    .filter({ visible: true })
    .evaluateAll((articles) => articles.map((a) => (a as HTMLElement).style.getPropertyValue("--i").trim()));
}

const positions = (n: number) => Array.from({ length: n }, (_, k) => String(k));
const delaysMs = (n: number) => Array.from({ length: n }, (_, k) => k * 40);
function cardDelayMs(c: FixCard) {
  const s = c.delay.split(",")[0].trim();
  return Math.round(s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000);
}

/** R1 assertions on one sample: contract order, `--i` = DOM position, delay = position x 40 ms. */
function expectStagger(sample: FixSample, expected: string[]) {
  expect(sample.cards.map((c) => c.name), "cards in the new order").toEqual(expected);
  expect(sample.cards.map((c) => c.i), "each card's --i equals its 0-based DOM position").toEqual(
    positions(expected.length),
  );
  expect(sample.cards.map(cardDelayMs), "computed animation-delay is position x 40ms").toEqual(
    delaysMs(expected.length),
  );
}

/** R2 assertions on one sample: one new pop-in per card, started after the click, first-to-last. */
function expectRestart(sample: FixSample, expected: string[]) {
  expect(sample.cards.map((c) => c.name), "cards in the new order").toEqual(expected);
  const summary = sample.cards.map((c) => {
    const pops = c.anims.filter((x) => x.name.includes("pop-in"));
    const restarted =
      pops.length === 1 && pops[0].isNew && pops[0].startTime != null && pops[0].startTime >= sample.t0 - 20;
    return { name: c.name, popIns: pops.length, restartedAfterClick: restarted };
  });
  expect(summary, "every card has exactly one pop-in animation, started after the click").toEqual(
    expected.map((name) => ({ name, popIns: 1, restartedAfterClick: true })),
  );
  const visibleStarts = sample.cards.map((c) => {
    const p = c.anims.find((x) => x.name.includes("pop-in"));
    return (p?.startTime ?? NaN) + (p?.delay ?? NaN);
  });
  for (let k = 1; k < visibleStarts.length; k++) {
    expect(visibleStarts[k], `${expected[k]} pops in after ${expected[k - 1]}`).toBeGreaterThan(visibleStarts[k - 1]);
  }
}

test("P12-fix1 R1: signed out, Low to high sets each card's --i and animation-delay to its new position", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await armClick(page);
  await option(page, ASC).click();
  const sample = await sampleCards(page, { mode: "stagger", expected: ASC_OUT });
  expectStagger(sample, ASC_OUT);
});

test("P12-fix1 R1: High to low after Low to high re-staggers every card by its new position", async ({ page }) => {
  await openCatalog(page, "/");
  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);
  await armClick(page);
  await option(page, DESC).click();
  const sample = await sampleCards(page, { mode: "stagger", expected: DESC_OUT });
  expectStagger(sample, DESC_OUT);
});

test("P12-fix1 R1: signed in, Low to high staggers all 12 visible cards (Set B included) by position", async ({
  page,
  context,
  baseURL,
}) => {
  if (!baseURL) throw new Error("baseURL is not configured");
  await addSessionCookie(context, baseURL);
  await openCatalog(page, "/");
  await expect(page.getByText("Member price", { exact: true }).first()).toBeVisible();
  await armClick(page);
  await option(page, ASC).click();
  const sample = await sampleCards(page, { mode: "stagger", expected: ASC_IN });
  expectStagger(sample, ASC_IN);
});

test("P12-fix1 R2: Low to high restarts the pop-in on every card (moved or not), first-to-last", async ({ page }) => {
  await openCatalog(page, "/");
  await waitForCardAnimationsToSettle(page);
  await armClick(page);
  await option(page, ASC).click();
  const sample = await sampleCards(page, { mode: "restart", expected: ASC_OUT });
  expectRestart(sample, ASC_OUT);
});

test("P12-fix1 R2: a second sort (High to low after Low to high) restarts the pop-in on every card again", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);
  await waitForCardAnimationsToSettle(page);
  await armClick(page);
  await option(page, DESC).click();
  const sample = await sampleCards(page, { mode: "restart", expected: DESC_OUT });
  expectRestart(sample, DESC_OUT);
});

test("P12-fix1 R3: clicking the active High to low after a client sort restarts nothing and keeps every --i", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await option(page, DESC).click();
  await expectCards(page, DESC_OUT);
  await waitForCardAnimationsToSettle(page);
  const iBefore = await cardIs(page);

  await armClick(page);
  await option(page, DESC).click();
  const sample = await sampleCards(page, { mode: "quiet", expected: DESC_OUT, expectedI: iBefore, ms: 1000 });
  expect(sample.violations, "no restarted animation, no --i change, no reorder").toEqual([]);
  expect(await cardIs(page)).toEqual(iBefore);
});

test("P12-fix1 R3: clicking the server-active Low to high on /?sort=price-asc restarts nothing and keeps --i 0..7", async ({
  page,
}) => {
  await openCatalog(page, "/?sort=price-asc");
  await expectCards(page, ASC_OUT);
  await waitForCardAnimationsToSettle(page);
  expect(await cardIs(page), "server --i is the server position").toEqual(positions(ASC_OUT.length));

  await armClick(page);
  await option(page, ASC).click();
  const sample = await sampleCards(page, {
    mode: "quiet",
    expected: ASC_OUT,
    expectedI: positions(ASC_OUT.length),
    ms: 1000,
  });
  expect(sample.violations, "no restarted animation, no --i change, no reorder").toEqual([]);
});

test("P12-fix1 R4: the server HTML gives each card an inline --i equal to its server-rendered position", async ({
  request,
}) => {
  for (const [path, count] of [
    ["/", NAME_ORDER_OUT.length],
    ["/?sort=price-asc", ASC_OUT.length],
    ["/?sort=price-desc", DESC_OUT.length],
  ] as const) {
    const res = await request.get(path);
    expect(res.status(), `${path} status`).toBe(200);
    const html = await res.text();
    const is = [...html.matchAll(/<article\b[^>]*>/g)].map((m) => /--i:\s*(-?\d+)/.exec(m[0])?.[1] ?? "missing");
    expect(is, `${path}: inline --i of each <article> in HTML order`).toEqual(positions(count));
  }
});

test("P12-fix1 R5: with prefers-reduced-motion: reduce no card animation runs on load or on sort clicks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCatalog(page, "/");
  const atLoad = await page.evaluate(() =>
    [...document.querySelectorAll("article")]
      .filter((a) => a.checkVisibility())
      .flatMap((a) => a.getAnimations())
      .filter((x) => x instanceof CSSAnimation && x.playState !== "idle")
      .map((x) => (x as CSSAnimation).animationName),
  );
  expect(atLoad, "no pop-in on load under reduced motion").toEqual([]);

  await armClick(page);
  await option(page, ASC).click();
  const asc = await sampleCards(page, { mode: "quiet", expected: ASC_OUT, expectedI: null, ms: 1000 });
  // Frames before the reorder lands report an order violation only; keep animation violations.
  expect(asc.violations.filter((v) => v.includes("animation")), "no animation after Low to high").toEqual([]);
  await expectCards(page, ASC_OUT);

  await armClick(page);
  await option(page, DESC).click();
  const desc = await sampleCards(page, { mode: "quiet", expected: DESC_OUT, expectedI: null, ms: 1000 });
  expect(desc.violations.filter((v) => v.includes("animation")), "no animation after High to low").toEqual([]);
  await expectCards(page, DESC_OUT);
});

test("P12-fix1 R6: Low to high then High to low keeps the same card DOM nodes as direct grid children (no remount)", async ({
  page,
}) => {
  await openCatalog(page, "/");
  await page.evaluate(() => {
    const articles = [...document.querySelectorAll("article")].filter((a) => a.checkVisibility());
    articles.forEach((a, k) => ((a as unknown as { __qaCard: string }).__qaCard = `card-${k}`));
    const grid = articles[0]?.parentElement;
    if (grid) (grid as unknown as { __qaGrid: boolean }).__qaGrid = true;
  });
  const tags = () =>
    page.evaluate(() => {
      const articles = [...document.querySelectorAll("article")].filter((a) => a.checkVisibility());
      const grid = articles[0]?.parentElement;
      return {
        sameGrid: !!grid && (grid as unknown as { __qaGrid?: boolean }).__qaGrid === true,
        directChildren: articles.every((a) => a.parentElement === grid),
        children: grid?.children.length ?? 0,
        tags: articles.map((a) => (a as unknown as { __qaCard?: string }).__qaCard ?? null),
      };
    });
  const ascTags = [7, 6, 3, 0, 2, 4, 1, 5].map((k) => `card-${k}`);

  await option(page, ASC).click();
  await expectCards(page, ASC_OUT);
  expect(await tags(), "after Low to high").toEqual({
    sameGrid: true,
    directChildren: true,
    children: ASC_OUT.length,
    tags: ascTags,
  });

  await option(page, DESC).click();
  await expectCards(page, DESC_OUT);
  expect(await tags(), "after High to low").toEqual({
    sameGrid: true,
    directChildren: true,
    children: DESC_OUT.length,
    tags: [...ascTags].reverse(),
  });
});
