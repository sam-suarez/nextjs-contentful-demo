// P10 member savings line (D-036): R1, R2, R4, R7, R9, R10.
// Written from handoffs/phase-10/spec.md (Requirements + Contract), mock data only.
//
// DOM hooks (Contract): the amount <span> inside Price carries `data-price-amount`, the savings
// row <div> carries `data-savings-row`, the pill <span> carries `data-savings`. Skeleton rows do
// not carry them. Mock data (P09): every member-tier product has savingsPercent 20, every
// signed-out product null; signed in `/` shows 12 cards, signed out 8.
//
// JavaScript enabled (single "chromium" project). Signed-in state uses a `session` cookie minted
// with jose and the Playwright webServer SESSION_SECRET, as in e2e/layout-shift.spec.ts.
// Positions are compared with a 0.5 px sub-pixel tolerance (EPS) where the spec says "at or below".
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import config from "../playwright.config";

const EPS = 0.5;
const PILL_TEXT = "You save 20%";
const DETAIL_PATH = "/products/cloud-bunny-plush";
const DETAIL_H1 = "Cloud Bunny Plush";

const VIEWPORTS = [
  { label: "1280x720", size: { width: 1280, height: 720 } },
  { label: "375x812", size: { width: 375, height: 812 } },
] as const;

const LAYOUTS = [
  { label: "Price first", path: "/", layout: "price" },
  { label: "Specs first", path: "/?layout=specs", layout: "specs" },
] as const;

const CARD_COUNT = { signedOut: 8, signedIn: 12 } as const;

function sessionSecret(): string {
  const ws = config.webServer;
  const server = Array.isArray(ws) ? ws[0] : ws;
  const secret = server?.env?.SESSION_SECRET;
  if (!secret) throw new Error("playwright.config.ts webServer.env.SESSION_SECRET is not set");
  return secret;
}

async function addSessionCookie(context: BrowserContext, baseURL: string) {
  const token = await new SignJWT({ name: "playwright-savings" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(sessionSecret()));
  await context.addCookies([
    { name: "session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax", secure: false },
  ]);
}

/** Load a page and wait until every skeleton is replaced and the h1 is visible. */
async function load(page: Page, path: string, h1: string) {
  await page.goto(path, { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1, name: h1, exact: true })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toHaveCount(0);
  await page.waitForLoadState("networkidle");
}

/**
 * Wait until every finite CSS animation/transition on the page has finished, so
 * getBoundingClientRect() reads the resting layout box, not a mid-animation transform
 * (the card entrance animation scales cards for a few hundred ms after load). Infinite
 * animations are ignored. Used by the R4 height check (dispute, handoffs/phase-10/qa.md).
 */
async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}

type Rect = { top: number; bottom: number; left: number; right: number; height: number };

type Block = {
  /** All `[data-price-amount]` / `[data-savings-row]` / `[data-savings]` in the scope (hidden included). */
  amounts: number;
  rows: number;
  pills: number;
  amount: Rect | null;
  row: Rect | null;
  pill: Rect | null;
  /** textContent of the row, trimmed. */
  rowText: string | null;
  /** The pill's child nodes: "text:<data>" or "el:<tag>". */
  pillChildren: string[];
  /** The pill sits inside the row. */
  pillInRow: boolean;
  /** The nearest common ancestor of amount and row does not contain the scope's heading. */
  rowInPriceBlock: boolean;
};

/**
 * One Block per visible scope element: every visible <article> that contains an <h2> (catalog
 * cards), or the visible <main> (detail, heading h1).
 */
async function measure(page: Page, scope: "cards" | "detail"): Promise<Block[]> {
  return page.evaluate((scope) => {
    const rect = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height };
    };
    const visible = (el: Element) => (el as HTMLElement).checkVisibility();
    const scopes =
      scope === "cards"
        ? [...document.querySelectorAll("article")].filter((a) => visible(a) && a.querySelector("h2"))
        : [...document.querySelectorAll("main")].filter(visible);
    const heading = scope === "cards" ? "h2" : "h1";
    return scopes.map((s) => {
      const amounts = [...s.querySelectorAll("[data-price-amount]")];
      const rows = [...s.querySelectorAll("[data-savings-row]")];
      const pills = [...s.querySelectorAll("[data-savings]")];
      const amount = amounts.find(visible) ?? null;
      const row = rows.find(visible) ?? rows[0] ?? null;
      const pill = pills.find(visible) ?? null;
      let rowInPriceBlock = false;
      if (amount && row) {
        let common: Element | null = amount.parentElement;
        while (common && !common.contains(row)) common = common.parentElement;
        const h = s.querySelector(heading);
        rowInPriceBlock = !!common && !!h && !common.contains(h);
      }
      return {
        amounts: amounts.length,
        rows: rows.length,
        pills: pills.length,
        amount: rect(amount),
        row: rect(row),
        pill: rect(pill),
        rowText: row ? (row.textContent ?? "").trim() : null,
        pillChildren: pill
          ? [...pill.childNodes].map((n) =>
              n.nodeType === Node.TEXT_NODE ? `text:${n.textContent}` : `el:${n.nodeName.toLowerCase()}`,
            )
          : [],
        pillInRow: !!pill && !!row && row.contains(pill),
        rowInPriceBlock,
      };
    });
  }, scope);
}

function must<T>(v: T | null, what: string): T {
  if (v === null) throw new Error(`${what} not rendered (contract DOM hook missing)`);
  return v;
}

/** R1: one amount and one savings row, the row inside the price block and under the amount. */
function expectRowUnderAmount(b: Block, where: string) {
  expect(b.amounts, `${where}: exactly one [data-price-amount] (price rendered once)`).toBe(1);
  expect(b.rows, `${where}: exactly one [data-savings-row]`).toBe(1);
  const amount = must(b.amount, `${where}: visible [data-price-amount]`);
  const row = must(b.row, `${where}: [data-savings-row]`);
  expect(row.top, `${where}: savings row top at or below the amount's bottom`).toBeGreaterThanOrEqual(amount.bottom - EPS);
  expect(b.rowInPriceBlock, `${where}: amount and savings row share the price block (not the card heading)`).toBe(true);
}

/** R2 (signed out / everyday tier): the row is present and empty, no pill. */
function expectEmptyRow(b: Block, where: string) {
  expectRowUnderAmount(b, where);
  expect(b.rowText, `${where}: savings row has no text`).toBe("");
  expect(b.pills, `${where}: no [data-savings] pill`).toBe(0);
}

/** R2 / R9 (member tier): one pill in the row, text "You save 20%" as one text node, under the amount. */
function expectPill(b: Block, where: string) {
  expectRowUnderAmount(b, where);
  expect(b.pills, `${where}: exactly one [data-savings] pill`).toBe(1);
  expect(b.pillChildren, `${where}: pill's only child is the text node "${PILL_TEXT}"`).toEqual([`text:${PILL_TEXT}`]);
  expect(b.pillInRow, `${where}: pill is inside [data-savings-row]`).toBe(true);
  const amount = must(b.amount, `${where}: visible [data-price-amount]`);
  const pill = must(b.pill, `${where}: visible [data-savings]`);
  expect(pill.top, `${where}: pill top at or below the amount's bottom (R9)`).toBeGreaterThanOrEqual(amount.bottom - EPS);
}

/** R4: the pill fits inside the fixed-height row without overflow. */
function expectPillFits(b: Block, where: string) {
  const row = must(b.row, `${where}: [data-savings-row]`);
  const pill = must(b.pill, `${where}: visible [data-savings]`);
  expect(pill.top, `${where}: pill top inside the savings row`).toBeGreaterThanOrEqual(row.top - EPS);
  expect(pill.bottom, `${where}: pill bottom inside the savings row`).toBeLessThanOrEqual(row.bottom + EPS);
}

for (const vp of VIEWPORTS) {
  for (const l of LAYOUTS) {
    test(`R1/R2: signed out ${l.path} (${l.label}) at ${vp.label}: every card has one empty savings row under its amount, no pill`, async ({
      page,
    }) => {
      await page.setViewportSize(vp.size);
      await load(page, l.path, "Toy catalog");
      await expect(page.locator(`[data-layout="${l.layout}"]`)).toHaveCount(1);
      const cards = await measure(page, "cards");
      expect(cards, "visible product cards").toHaveLength(CARD_COUNT.signedOut);
      cards.forEach((b, i) => expectEmptyRow(b, `card ${i + 1}`));
    });

    test(`R2/R7/R9: signed in ${l.path} (${l.label}) at ${vp.label}: every card shows one "${PILL_TEXT}" pill under its amount, ${l.layout === "specs" ? "right" : "left"}-aligned with it`, async ({
      page,
      context,
      baseURL,
    }) => {
      if (!baseURL) throw new Error("baseURL is not configured");
      await page.setViewportSize(vp.size);
      await addSessionCookie(context, baseURL);
      await load(page, l.path, "Toy catalog");
      await expect(page.locator(`[data-layout="${l.layout}"]`)).toHaveCount(1);
      const cards = await measure(page, "cards");
      expect(cards, "visible product cards").toHaveLength(CARD_COUNT.signedIn);
      cards.forEach((b, i) => {
        const where = `card ${i + 1}`;
        expectPill(b, where);
        const amount = must(b.amount, where);
        const pill = must(b.pill, where);
        if (l.layout === "specs") {
          // R9 / R7: Specs first, right edge within 2 px of the amount's right edge.
          expect(Math.abs(pill.right - amount.right), `${where}: pill right edge within 2 px of the amount's`).toBeLessThanOrEqual(2);
        } else {
          // R7: Price first, left-aligned under the amount.
          expect(Math.abs(pill.left - amount.left), `${where}: pill left edge within 2 px of the amount's`).toBeLessThanOrEqual(2);
        }
      });
    });

    test(`R4: signed in ${l.path} (${l.label}) at ${vp.label}: the pill fits inside its savings row, and every row has the same height signed in and out`, async ({
      browser,
      baseURL,
    }) => {
      if (!baseURL) throw new Error("baseURL is not configured");
      const heights: number[] = [];
      for (const signedIn of [false, true]) {
        const context = await browser.newContext({ viewport: vp.size });
        try {
          if (signedIn) await addSessionCookie(context, baseURL);
          const page = await context.newPage();
          await load(page, l.path, "Toy catalog");
          await settleAnimations(page);
          const cards = await measure(page, "cards");
          expect(cards.length, "visible product cards").toBeGreaterThan(0);
          cards.forEach((b, i) => {
            const where = `${signedIn ? "signed in" : "signed out"} card ${i + 1}`;
            const row = must(b.row, `${where}: [data-savings-row]`);
            expect(row.height, `${where}: savings row has a non-zero fixed height`).toBeGreaterThan(0);
            heights.push(row.height);
            if (signedIn) expectPillFits(b, where);
          });
        } finally {
          await context.close();
        }
      }
      const spread = Math.max(...heights) - Math.min(...heights);
      expect(spread, `savings row heights ${[...new Set(heights)].join(", ")} px differ`).toBeLessThanOrEqual(EPS);
    });
  }

  test(`R1/R2: signed out ${DETAIL_PATH} at ${vp.label}: the price card has one empty savings row under the amount`, async ({
    page,
  }) => {
    await page.setViewportSize(vp.size);
    await load(page, DETAIL_PATH, DETAIL_H1);
    const blocks = await measure(page, "detail");
    expect(blocks, "visible <main>").toHaveLength(1);
    expectEmptyRow(blocks[0], "detail");
  });

  test(`R2/R9: signed in ${DETAIL_PATH} at ${vp.label}: one "${PILL_TEXT}" pill under the amount, inside its row`, async ({
    page,
    context,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("baseURL is not configured");
    await page.setViewportSize(vp.size);
    await addSessionCookie(context, baseURL);
    await load(page, DETAIL_PATH, DETAIL_H1);
    const blocks = await measure(page, "detail");
    expect(blocks, "visible <main>").toHaveLength(1);
    expectPill(blocks[0], "detail");
    expectPillFits(blocks[0], "detail");
  });

  test(`R10: ${DETAIL_PATH} at ${vp.label}: the price card is the same height signed out and signed in (within 1 px)`, async ({
    browser,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("baseURL is not configured");
    const out = await priceCardHeight(browser, baseURL, vp.size, false);
    const inn = await priceCardHeight(browser, baseURL, vp.size, true);
    expect(Math.abs(out - inn), `price card height signed out ${out} px vs signed in ${inn} px`).toBeLessThanOrEqual(1);
  });
}

/**
 * Height of the detail price card: the nearest ancestor of the visible `[data-price-amount]` that
 * also holds the state's second row (design.md Screens: Product detail): signed out, the
 * "Sign in for member pricing" link to /login; signed in, the "Member price applied" note.
 * The card must also hold the savings row.
 */
async function priceCardHeight(
  browser: Browser,
  baseURL: string,
  viewport: { width: number; height: number },
  signedIn: boolean,
): Promise<number> {
  const context = await browser.newContext({ viewport });
  try {
    if (signedIn) await addSessionCookie(context, baseURL);
    const page = await context.newPage();
    await load(page, DETAIL_PATH, DETAIL_H1);
    await expect(page.locator("main [data-price-amount]").filter({ visible: true })).toHaveCount(1);
    const height = await page.evaluate((signedIn) => {
      const amount = [...document.querySelectorAll("main [data-price-amount]")].find((el) =>
        (el as HTMLElement).checkVisibility(),
      );
      let el: Element | null = amount?.parentElement ?? null;
      const holdsSecondRow = (e: Element) =>
        signedIn
          ? (e.textContent ?? "").includes("Member price applied")
          : [...e.querySelectorAll('a[href^="/login"]')].some((a) =>
              (a.textContent ?? "").includes("Sign in for member pricing"),
            );
      while (el && el.tagName !== "MAIN" && !holdsSecondRow(el)) el = el.parentElement;
      if (!el || el.tagName === "MAIN" || !el.querySelector("[data-savings-row]")) return null;
      return el.getBoundingClientRect().height;
    }, signedIn);
    if (height === null) {
      throw new Error(`price card (amount + ${signedIn ? "member note" : "sign-in row"} + savings row) not found`);
    }
    return height;
  } finally {
    await context.close();
  }
}
