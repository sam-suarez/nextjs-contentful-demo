import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { cache } from "react";

import { fetchContentfulProducts } from "@/lib/products/contentful-adapter";
import { fetchMockProducts } from "@/lib/products/mock-adapter";
import { getProductSource } from "@/lib/products/source";
import { toCatalogProduct } from "@/lib/products/to-catalog-product";
import type { CatalogProduct } from "@/lib/products/types";
import { SESSION_COOKIE, verifySessionToken, type Session } from "@/lib/session";
import { SLUG_PATTERN, type ProductEntry, type Visibility } from "@/schemas/product";

export type ProductBySlugResult =
  | { status: "found"; product: CatalogProduct }
  | { status: "requires-login" }
  | { status: "not-found" };

/** Reads and verifies the session cookie once per request. Returns the session or null. */
export const verifySession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/**
 * Cached product entries, keyed only by `sets` (D-020). Never reads request data:
 * the DAL decides `sets` from the session before calling it.
 */
async function fetchProducts(sets: readonly Visibility[]): Promise<ProductEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("products");
  return getProductSource() === "contentful" ? fetchContentfulProducts(sets) : fetchMockProducts(sets);
}

/** Set A logged out (everyday prices); Set A + Set B in name order with a session (member prices). */
export async function getProducts(): Promise<CatalogProduct[]> {
  const session = await verifySession();
  if (session) {
    const entries = await fetchProducts(["public", "authenticated"]);
    return entries.map((entry) => toCatalogProduct(entry, "member"));
  }
  const entries = await fetchProducts(["public"]);
  return entries.map((entry) => toCatalogProduct(entry, "everyday"));
}

/** The product this visitor may see, or a bare status (no product data) for requires-login / not-found. */
export async function getProductBySlug(slug: string): Promise<ProductBySlugResult> {
  if (!SLUG_PATTERN.test(slug)) return { status: "not-found" };

  const session = await verifySession();
  if (session) {
    const entry = (await fetchProducts(["public", "authenticated"])).find((e) => e.fields.slug === slug);
    return entry ? { status: "found", product: toCatalogProduct(entry, "member") } : { status: "not-found" };
  }

  const entry = (await fetchProducts(["public"])).find((e) => e.fields.slug === slug);
  if (entry) return { status: "found", product: toCatalogProduct(entry, "everyday") };

  // Logged out and not public: only tell "requires login" from "not found". Nothing from
  // this lookup is returned, mapped or logged (R13).
  const existsInSetB = (await fetchProducts(["public", "authenticated"])).some((e) => e.fields.slug === slug);
  return existsInSetB ? { status: "requires-login" } : { status: "not-found" };
}
