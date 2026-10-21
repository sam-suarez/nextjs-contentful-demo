import "server-only";

import { fetchContentfulProducts } from "@/lib/products/contentful-adapter";
import { fetchMockProducts } from "@/lib/products/mock-adapter";
import { getProductSource } from "@/lib/products/source";
import { SLUG_PATTERN } from "@/schemas/product";

/** How long the Set B slug list is kept in memory before the next call refetches it (D-032). */
export const MEMBERS_ONLY_SLUGS_TTL_MS = 5 * 60 * 1000;

type CachedSlugs = { slugs: ReadonlySet<string>; expiresAt: number };

let cached: CachedSlugs | undefined;
let inFlight: Promise<ReadonlySet<string>> | undefined;

/** Fetches the `authenticated` slugs from the active source and fills the cache. Rejections are not cached. */
async function loadSlugs(): Promise<ReadonlySet<string>> {
  const fetchProducts = getProductSource() === "contentful" ? fetchContentfulProducts : fetchMockProducts;
  const entries = await fetchProducts(["authenticated"]);
  const slugs: ReadonlySet<string> = new Set(entries.map((entry) => entry.fields.slug));
  cached = { slugs, expiresAt: Date.now() + MEMBERS_ONLY_SLUGS_TTL_MS };
  // Prints only the count, never a slug, name or env value.
  console.info(`[products] members-only slugs loaded: ${slugs.size}`);
  return slugs;
}

/** The cached slug list while it is fresh; otherwise one shared fetch for all concurrent callers. */
function membersOnlySlugs(): Promise<ReadonlySet<string>> {
  if (cached && Date.now() < cached.expiresAt) return Promise.resolve(cached.slugs);
  if (!inFlight) {
    inFlight = loadSlugs().finally(() => {
      inFlight = undefined;
    });
  }
  return inFlight;
}

/**
 * True exactly for slugs of Set B (`authenticated`) products from the active source.
 * Used by src/proxy.ts for its optimistic redirect only; the DAL stays the authorization check (D-017, D-032).
 * Strings that fail SLUG_PATTERN resolve false without fetching. Rejects if the fetch fails.
 */
export async function isMembersOnlySlug(slug: string): Promise<boolean> {
  if (!SLUG_PATTERN.test(slug)) return false;
  const slugs = await membersOnlySlugs();
  return slugs.has(slug);
}
