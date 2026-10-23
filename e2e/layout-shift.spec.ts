// P07 R10 (D-031): Cumulative Layout Shift while the Suspense skeletons are replaced.
// Also covers the e2e part of R4 (header session skeleton), R5 (banner + catalog), R6 (detail)
// and R8 (skeleton outer size equals the content's, at 1280x720 and at 375 px width).
// Written from handoffs/phase-07/spec.md (Requirements + Contract), mock data only.
//
// Before navigation, an init script installs:
//   - a PerformanceObserver for `layout-shift` (buffered: true) that sums `value` of every entry
//     without `hadRecentInput`;
//   - a MutationObserver that records every element with a `data-skeleton` attribute the page
//     ever puts in the DOM (with its `aria-busy`), so the test knows the skeletons really were
//     part of the load it measured (Contract: root data-skeleton values, aria-busy="true").
// P12 R15 (D-038): ROUTES also covers the sorted URL /?sort=price-desc.
// JavaScript enabled (single "chromium" project). Logged-in state uses a `session` cookie minted
// with jose and the Playwright webServer SESSION_SECRET (Contract allows this).
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import config from "../playwright.config";

const CLS_LIMIT = 0.01;

const VIEWPORTS = [
  { label: "1280x720", size: { width: 1280, height: 720 } },
  { label: "375 px", size: { width: 375, height: 812 } },
] as const;

type Route = {
  path: string;
  /** Visible h1 text after load (page h1 or product name). */
  h1: string;
  /** Skeleton roots (Contract `data-skeleton` values) the load must have shown and replaced. */
  skeletons: string[];
  /**
   * P12 R15 (D-038): for a sorted URL, the first card's <h2> once loaded, per session state
   * (handoffs/phase-12/spec.md Contract, Expected data), and the Price control must be visible.
   * Proves the CLS was measured on the sorted render with the real Price control in place.
   */
  sorted?: { loggedOut: string; loggedIn: string };
};

const ROUTES: Route[] = [
  { path: "/", h1: "Toy catalog", skeletons: ["header-session", "banner", "catalog"] },
  { path: "/?category=bath", h1: "Toy catalog", skeletons: ["header-session", "banner", "catalog"] },
  { path: "/products/cloud-bunny-plush", h1: "Cloud Bunny Plush", skeletons: ["header-session", "product-detail"] },
  // P12 R15 (D-038): a sorted URL, logged out and in, at both viewports.
  {
    path: "/?sort=price-desc",
    h1: "Toy catalog",
    skeletons: ["header-session", "banner", "catalog"],
    sorted: { loggedOut: "Shape Sorter Cube", loggedIn: "Forest Friends Activity Cube" },
  },
];

const STATES = [
  { label: "logged out", loggedIn: false, priceLabel: "Everyday price" },
  { label: "logged in", loggedIn: true, priceLabel: "Member price" },
] as const;

function sessionSecret(): string {
  const ws = config.webServer;
  const server = Array.isArray(ws) ? ws[0] : ws;
  const secret = server?.env?.SESSION_SECRET;
  if (!secret) throw new Error("playwright.config.ts webServer.env.SESSION_SECRET is not set");
  return secret;
}

async function addSessionCookie(context: BrowserContext, baseURL: string) {
  const token = await new SignJWT({ name: "playwright-cls" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(sessionSecret()));
  await context.addCookies([
    { name: "session", value: token, url: baseURL, httpOnly: true, sameSite: "Lax", secure: false },
  ]);
}

type Probe = { cls: number; shifts: number; skeletons: Record<string, string | null> };

async function installProbe(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __qaProbe: Probe };
    w.__qaProbe = { cls: 0, shifts: 0, skeletons: {} };
    type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Shift[]) {
        if (entry.hadRecentInput) continue;
        w.__qaProbe.cls += entry.value;
        w.__qaProbe.shifts += 1;
      }
    }).observe({ type: "layout-shift", buffered: true });

    const record = (el: Element) => {
      const name = el.getAttribute("data-skeleton");
      if (name !== null && !(name in w.__qaProbe.skeletons)) {
        w.__qaProbe.skeletons[name] = el.getAttribute("aria-busy");
      }
    };
    const scan = (node: Node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      record(el);
      el.querySelectorAll("[data-skeleton]").forEach(record);
    };
    new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach(scan);
    }).observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", () => scan(document.documentElement));
  });
}

async function readProbe(page: Page): Promise<Probe> {
  return page.evaluate(() => (window as unknown as { __qaProbe: Probe }).__qaProbe);
}

/** Let any late layout-shift entries land: two animation frames, then a short idle. */
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 500))),
      ),
  );
}

for (const vp of VIEWPORTS) {
  for (const state of STATES) {
    for (const route of ROUTES) {
      test(`R10: ${route.path} ${state.label} at ${vp.label}: skeletons replaced, CLS below ${CLS_LIMIT}, real content visible`, async ({
        page,
        context,
        baseURL,
      }) => {
        if (!baseURL) throw new Error("baseURL is not configured");
        await page.setViewportSize(vp.size);
        if (state.loggedIn) await addSessionCookie(context, baseURL);
        await installProbe(page);

        await page.goto(route.path, { waitUntil: "load" });

        // Real content (R10): page h1 / product name and the state's price label are visible.
        await expect(page.getByRole("heading", { level: 1, name: route.h1, exact: true })).toBeVisible();
        await expect(page.getByText(state.priceLabel, { exact: true }).first()).toBeVisible();

        // No skeleton left in the visible page once loaded (R10).
        await expect(page.locator('[aria-busy="true"]').filter({ visible: true })).toHaveCount(0);

        // P12 R15: the sorted render, with the real Price control in place of its skeleton.
        if (route.sorted) {
          const first = state.loggedIn ? route.sorted.loggedIn : route.sorted.loggedOut;
          await expect(page.locator("article").filter({ visible: true }).first().locator("h2")).toHaveText(first);
          await expect(page.locator('[role="group"][aria-labelledby="sort-label"]').filter({ visible: true })).toHaveCount(1);
        }

        await page.waitForLoadState("networkidle");
        await settle(page);
        const probe = await readProbe(page);

        // The load really went through the skeletons this route's boundaries own (R4, R5, R6;
        // Contract: root data-skeleton values, each with aria-busy="true").
        for (const name of route.skeletons) {
          expect.soft(probe.skeletons[name], `skeleton data-skeleton="${name}" shown during load with aria-busy="true"`).toBe(
            "true",
          );
        }

        // Swapping skeletons for content shifts nothing (R8, R10, D-031).
        expect(probe.cls, `CLS over ${probe.shifts} layout-shift entries`).toBeLessThan(CLS_LIMIT);
      });
    }
  }
}
