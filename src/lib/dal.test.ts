import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cookieGet = vi.fn();
  const wrappers = new Set<unknown>();
  return {
    cookieGet,
    cookies: vi.fn(async () => ({ get: cookieGet })),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    // Pass-through stand-in for React cache that remembers what it returned (R9).
    cache: vi.fn(<T extends (...args: never[]) => unknown>(fn: T): T => {
      const wrapped = ((...args: never[]) => fn(...args)) as T;
      wrappers.add(wrapped);
      return wrapped;
    }),
    wrappers,
    // R19: the DAL tests select the mock source; contentful must never be reached.
    createClient: vi.fn(() => {
      throw new Error("contentful must not be called in DAL tests");
    }),
  };
});

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ cacheLife: mocks.cacheLife, cacheTag: mocks.cacheTag }));
vi.mock("contentful", () => ({ createClient: mocks.createClient }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: mocks.cache };
});

import mockData from "@/data/products.mock.json";
import {
  getProductBySlug,
  getProducts,
  verifySession,
  type ProductBySlugResult,
} from "@/lib/dal";
import type { CatalogProduct } from "@/lib/products/types";
import { SESSION_COOKIE, signSession, type Session } from "@/lib/session";
import { productCollectionSchema, type ProductEntry } from "@/schemas/product";

// P09 contract field. The intersection keeps pre-build typecheck clean (CatalogProduct lacks it
// until the build); post-build it is the same type.
type CatalogProductWithSavings = CatalogProduct & { savingsPercent: number | null };

// Typed through the spec contract, so a missing module is the only pre-build type error.
const readSession = (): Promise<Session | null> => verifySession();
const readProducts = (): Promise<CatalogProductWithSavings[]> =>
  getProducts() as Promise<CatalogProductWithSavings[]>;
const readBySlug = (slug: string): Promise<ProductBySlugResult> => getProductBySlug(slug);

const SECRET = "dal-test-secret-0123456789-abcdefghijkl"; // > 32 chars
const DAY_MS = 24 * 60 * 60 * 1000;

const SET_B = [
  "forest-friends-activity-cube",
  "heirloom-wooden-xylophone",
  "moonbeam-musical-mobile",
  "sensory-crinkle-book-set",
];

const entries = productCollectionSchema
  .parse(mockData)
  .items.sort((a, b) => a.fields.name.localeCompare(b.fields.name, "en"));

/** The CatalogProduct the spec (R7, R8; P09 R4, R5) says a mock entry maps to. */
function expected(e: ProductEntry, tier: "everyday" | "member"): CatalogProductWithSavings {
  const f = e.fields;
  return {
    id: e.sys.id,
    slug: f.slug,
    name: f.name,
    category: f.category,
    visibility: f.visibility,
    description: f.description,
    ageRange: f.ageRange,
    material: f.material,
    features: [...(f.features ?? [])],
    image: f.image
      ? {
          url: f.image.fields.file.url,
          alt: f.image.fields.description ?? f.image.fields.title,
          width: f.image.fields.file.details.image?.width ?? null,
          height: f.image.fields.file.details.image?.height ?? null,
        }
      : null,
    price: tier === "member" ? f.priceAuthenticated : f.priceLoggedOut,
    priceTier: tier,
    // P09 spec: every mock member price is 0.8 × everyday, so every member-tier product saves 20%.
    savingsPercent: tier === "member" ? 20 : null,
  };
}

const EXPECTED_PUBLIC = entries.filter((e) => e.fields.visibility === "public").map((e) => expected(e, "everyday"));
const EXPECTED_ALL = entries.map((e) => expected(e, "member"));
const PUBLIC_SLUGS = EXPECTED_PUBLIC.map((p) => p.slug);
const ALL_SLUGS = EXPECTED_ALL.map((p) => p.slug);
const entryBySlug = (slug: string) => entries.find((e) => e.fields.slug === slug)!;

const P09_KEYS = [
  "ageRange", "category", "description", "features", "id", "image", "material", "name",
  "price", "priceTier", "savingsPercent", "slug", "visibility",
];

/** savingsPercent of a found getProductBySlug result; throws on any other status. */
async function slugSavings(slug: string): Promise<number | null> {
  const result = await readBySlug(slug);
  if (result.status !== "found") throw new Error(`expected found for ${slug}, got ${result.status}`);
  return (result.product as CatalogProductWithSavings).savingsPercent;
}

/** Makes the mocked cookie store return this value for the session cookie (undefined = no cookie). */
function setSessionCookie(value: string | undefined) {
  mocks.cookieGet.mockImplementation((name: string) =>
    name === SESSION_COOKIE && value !== undefined ? { name, value } : undefined,
  );
}

async function loginAs(name: string) {
  setSessionCookie(await signSession(name));
}

/** A token whose signature has been altered in the middle. */
async function tamperedToken() {
  const [header, payload, signature] = (await signSession("mallory")).split(".");
  const i = Math.floor(signature.length / 2);
  const flipped = signature.slice(0, i) + (signature[i] === "A" ? "B" : "A") + signature.slice(i + 1);
  return [header, payload, flipped].join(".");
}

/** A token signed 8 days ago, so its 7-day expiry has passed. */
async function expiredToken() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.now() - 8 * DAY_MS);
  try {
    return await signSession("old-visitor");
  } finally {
    vi.useRealTimers();
  }
}

const noSessionCases = [
  { label: "no cookie", token: async () => undefined },
  { label: "a tampered token", token: tamperedToken },
  { label: "an expired token", token: expiredToken },
];

describe("dal", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("CONTENTFUL_SPACE_ID", "");
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", "");
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", "");
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.cookies.mockClear();
    mocks.cookieGet.mockReset();
    mocks.cacheLife.mockClear();
    mocks.cacheTag.mockClear();
    mocks.createClient.mockClear();
    setSessionCookie(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  // R9: verifySession

  it("R9: verifySession reads the session cookie by SESSION_COOKIE from next/headers cookies()", async () => {
    await loginAs("ada");
    await readSession();
    expect(mocks.cookies).toHaveBeenCalled();
    expect(mocks.cookieGet).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("R9: a valid token resolves to { name, expiresAt }", async () => {
    await loginAs("Ada Lovelace");
    const session = await readSession();
    expect(session?.name).toBe("Ada Lovelace");
    expect(session?.expiresAt).toBeInstanceOf(Date);
    expect(Object.keys(session ?? {}).sort()).toStrictEqual(["expiresAt", "name"]);
  });

  it.each(noSessionCases)("R9: $label resolves to null", async ({ token }) => {
    setSessionCookie(await token());
    await expect(readSession()).resolves.toBeNull();
  });

  it("R9: verifySession is the function returned by React cache()", () => {
    // cache() runs at import; Vitest 5 clears mock call history before each test
    // (clearMocks defaults to true), so check the returned wrapper instead.
    expect(mocks.wrappers.has(verifySession)).toBe(true);
  });

  it("R9: a session cookie with SESSION_SECRET unset rejects (no silent logged-out fallback)", async () => {
    await loginAs("ada");
    delete process.env.SESSION_SECRET;
    await expect(readSession()).rejects.toThrow();
    await expect(readProducts()).rejects.toThrow();
    await expect(readBySlug("cloud-bunny-plush")).rejects.toThrow();
  });

  // R10: getProducts without a session

  it.each(noSessionCases)("R10: $label → exactly the 8 public CatalogProducts in name order", async ({ token }) => {
    setSessionCookie(await token());
    await expect(readProducts()).resolves.toStrictEqual(EXPECTED_PUBLIC);
  });

  it("R10: logged out, every product has priceTier everyday and price = priceLoggedOut", async () => {
    const products = await readProducts();
    expect(products.map((p) => p.slug)).toStrictEqual(PUBLIC_SLUGS);
    for (const p of products) {
      expect(p.priceTier).toBe("everyday");
      expect(p.price).toBe(entryBySlug(p.slug).fields.priceLoggedOut);
    }
  });

  it("R10: logged out, no product is authenticated and none has a priceAuthenticated key", async () => {
    const products = await readProducts();
    expect(products).toHaveLength(8);
    for (const p of products) {
      expect(p.visibility).not.toBe("authenticated");
      expect(SET_B).not.toContain(p.slug);
      expect(Object.prototype.hasOwnProperty.call(p, "priceAuthenticated")).toBe(false);
    }
  });

  // R11: getProducts with a session

  it("R11: with a valid session → all 12 CatalogProducts in name order", async () => {
    await loginAs("ada");
    await expect(readProducts()).resolves.toStrictEqual(EXPECTED_ALL);
  });

  it("R11: Set B is mixed into name order, not appended (index 2 is forest-friends-activity-cube)", async () => {
    await loginAs("ada");
    const slugs = (await readProducts()).map((p) => p.slug);
    expect(slugs).toStrictEqual(ALL_SLUGS);
    expect(slugs[2]).toBe("forest-friends-activity-cube");
  });

  it("R11: with a valid session, every product has priceTier member and price = priceAuthenticated", async () => {
    await loginAs("ada");
    const products = await readProducts();
    expect(products).toHaveLength(12);
    for (const p of products) {
      expect(p.priceTier).toBe("member");
      expect(p.price).toBe(entryBySlug(p.slug).fields.priceAuthenticated);
    }
  });

  // R12, R13: getProductBySlug

  it("R12: no session + public slug → found with everyday price 28 (cloud-bunny-plush)", async () => {
    const result = await readBySlug("cloud-bunny-plush");
    expect(result).toStrictEqual({
      status: "found",
      product: expected(entryBySlug("cloud-bunny-plush"), "everyday"),
    });
    if (result.status !== "found") throw new Error("expected found");
    expect(result.product.priceTier).toBe("everyday");
    expect(result.product.price).toBe(28);
  });

  it("R12: no session + Set B slug → requires-login (heirloom-wooden-xylophone)", async () => {
    await expect(readBySlug("heirloom-wooden-xylophone")).resolves.toStrictEqual({ status: "requires-login" });
  });

  it.each(noSessionCases)("R12: $label + every Set B slug → requires-login", async ({ token }) => {
    setSessionCookie(await token());
    for (const slug of SET_B) {
      await expect(readBySlug(slug)).resolves.toStrictEqual({ status: "requires-login" });
    }
  });

  it("R12: no session + every public slug → found with the everyday CatalogProduct", async () => {
    for (const slug of PUBLIC_SLUGS) {
      await expect(readBySlug(slug)).resolves.toStrictEqual({
        status: "found",
        product: expected(entryBySlug(slug), "everyday"),
      });
    }
  });

  it("R12: no session + unknown slug → not-found (no-such-toy)", async () => {
    await expect(readBySlug("no-such-toy")).resolves.toStrictEqual({ status: "not-found" });
  });

  it("R12: valid session + Set B slug → found with member price 43.2 (heirloom-wooden-xylophone)", async () => {
    await loginAs("ada");
    const result = await readBySlug("heirloom-wooden-xylophone");
    expect(result).toStrictEqual({
      status: "found",
      product: expected(entryBySlug("heirloom-wooden-xylophone"), "member"),
    });
    if (result.status !== "found") throw new Error("expected found");
    expect(result.product.priceTier).toBe("member");
    expect(result.product.price).toBe(43.2);
  });

  it("R12: valid session + public slug → found with member price 22.4 (cloud-bunny-plush)", async () => {
    await loginAs("ada");
    const result = await readBySlug("cloud-bunny-plush");
    expect(result).toStrictEqual({
      status: "found",
      product: expected(entryBySlug("cloud-bunny-plush"), "member"),
    });
    if (result.status !== "found") throw new Error("expected found");
    expect(result.product.priceTier).toBe("member");
    expect(result.product.price).toBe(22.4);
  });

  it("R12: valid session + unknown slug → not-found", async () => {
    await loginAs("ada");
    await expect(readBySlug("no-such-toy")).resolves.toStrictEqual({ status: "not-found" });
  });

  it("R12: a valid session never yields requires-login (every slug is found as member)", async () => {
    await loginAs("ada");
    for (const slug of ALL_SLUGS) {
      await expect(readBySlug(slug)).resolves.toStrictEqual({
        status: "found",
        product: expected(entryBySlug(slug), "member"),
      });
    }
  });

  it("R12: lookup is an exact, case-sensitive slug match (a prefix is not-found)", async () => {
    await loginAs("ada");
    await expect(readBySlug("cloud-bunny")).resolves.toStrictEqual({ status: "not-found" });
  });

  it.each(["", "../etc", "Cloud-Bunny-Plush"])(
    'R12: malformed slug "%s" without a session → not-found, with no product fetch',
    async (slug) => {
      await expect(readBySlug(slug)).resolves.toStrictEqual({ status: "not-found" });
      expect(mocks.cacheTag).not.toHaveBeenCalled();
    },
  );

  it.each(["", "../etc", "Cloud-Bunny-Plush"])(
    'R12: malformed slug "%s" with a valid session → not-found, with no product fetch',
    async (slug) => {
      await loginAs("ada");
      await expect(readBySlug(slug)).resolves.toStrictEqual({ status: "not-found" });
      expect(mocks.cacheTag).not.toHaveBeenCalled();
    },
  );

  it("R13: requires-login carries no product data (only the status key)", async () => {
    const result = await readBySlug("moonbeam-musical-mobile");
    expect(result).toStrictEqual({ status: "requires-login" });
    expect(Object.keys(result)).toStrictEqual(["status"]);
    const serialized = JSON.stringify(result);
    const e = entryBySlug("moonbeam-musical-mobile");
    for (const leak of [e.fields.name, e.fields.slug, String(e.fields.priceAuthenticated), String(e.fields.priceLoggedOut)]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("R13: not-found deep-equals { status: \"not-found\" } with no other keys", async () => {
    const result = await readBySlug("no-such-toy");
    expect(result).toStrictEqual({ status: "not-found" });
    expect(Object.keys(result)).toStrictEqual(["status"]);
  });

  // R14: fetchProducts caching (next/cache mocked; "use cache" is inert under Vitest)

  it.each([
    { label: "getProducts logged out", read: () => readProducts() },
    {
      label: "getProducts logged in",
      read: async () => {
        await loginAs("ada");
        return readProducts();
      },
    },
    { label: "getProductBySlug logged out", read: () => readBySlug("cloud-bunny-plush") },
    {
      label: "getProductBySlug logged in",
      read: async () => {
        await loginAs("ada");
        return readBySlug("cloud-bunny-plush");
      },
    },
  ])('R14: $label calls cacheTag("products") and cacheLife("hours")', async ({ read }) => {
    await read();
    expect(mocks.cacheTag).toHaveBeenCalledWith("products");
    expect(mocks.cacheLife).toHaveBeenCalledWith("hours");
    for (const call of mocks.cacheTag.mock.calls) expect(call).toStrictEqual(["products"]);
    for (const call of mocks.cacheLife.mock.calls) expect(call).toStrictEqual(["hours"]);
  });

  it("R14: each DAL read calls cacheTag and cacheLife again (fetchProducts runs per call under Vitest)", async () => {
    await readProducts();
    const afterFirst = mocks.cacheTag.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);
    await readProducts();
    expect(mocks.cacheTag.mock.calls.length).toBeGreaterThan(afterFirst);
    expect(mocks.cacheLife.mock.calls.length).toBe(mocks.cacheTag.mock.calls.length);
  });

  // R19: no network from DAL tests

  it("R19: with the CONTENTFUL_* vars blank, DAL reads never reach contentful", async () => {
    await readProducts();
    await loginAs("ada");
    await readProducts();
    await readBySlug("heirloom-wooden-xylophone");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  // P09: savingsPercent through the DAL

  it("P09 R5: with a valid session, getProducts returns 12 products, each with savingsPercent 20", async () => {
    await loginAs("ada");
    const products = await readProducts();
    expect(products.map((p) => p.slug)).toStrictEqual(ALL_SLUGS);
    for (const p of products) expect(p.savingsPercent, p.slug).toBe(20);
  });

  it.each(noSessionCases)(
    "P09 R5: $label → getProducts returns the 8 public products, each with savingsPercent null",
    async ({ token }) => {
      setSessionCookie(await token());
      const products = await readProducts();
      expect(products.map((p) => p.slug)).toStrictEqual(PUBLIC_SLUGS);
      for (const p of products) expect(p.savingsPercent, p.slug).toBeNull();
    },
  );

  it("P09 R3: getProducts products have exactly the CatalogProduct keys incl. savingsPercent, with and without a session", async () => {
    for (const p of await readProducts()) expect(Object.keys(p).sort(), p.slug).toStrictEqual(P09_KEYS);
    await loginAs("ada");
    for (const p of await readProducts()) expect(Object.keys(p).sort(), p.slug).toStrictEqual(P09_KEYS);
  });

  it("P09 R6: logged in, getProductBySlug(cloud-bunny-plush) has savingsPercent 20", async () => {
    await loginAs("ada");
    await expect(slugSavings("cloud-bunny-plush")).resolves.toBe(20);
  });

  it("P09 R6: logged in, getProductBySlug(forest-friends-activity-cube) has savingsPercent 20", async () => {
    await loginAs("ada");
    await expect(slugSavings("forest-friends-activity-cube")).resolves.toBe(20);
  });

  it("P09 R6: logged out, getProductBySlug(cloud-bunny-plush) has savingsPercent null", async () => {
    await expect(slugSavings("cloud-bunny-plush")).resolves.toBeNull();
  });

  it("P09 R6: logged in, every slug's savingsPercent matches getProducts for that slug", async () => {
    await loginAs("ada");
    const products = await readProducts();
    expect(products).toHaveLength(12);
    for (const p of products) {
      expect(p.savingsPercent, p.slug).toBe(20);
      await expect(slugSavings(p.slug), p.slug).resolves.toBe(p.savingsPercent);
    }
  });

  it("P09 R6: logged out, every public slug's savingsPercent matches getProducts for that slug", async () => {
    const products = await readProducts();
    expect(products).toHaveLength(8);
    for (const p of products) {
      expect(p.savingsPercent, p.slug).toBeNull();
      await expect(slugSavings(p.slug), p.slug).resolves.toBe(p.savingsPercent);
    }
  });
});
