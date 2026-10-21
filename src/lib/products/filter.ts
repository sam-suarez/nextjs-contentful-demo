import "server-only";

import type { CatalogProduct } from "@/lib/products/types";
import { CATEGORIES } from "@/schemas/product";

/** Raw values as read from searchParams; validation happens here (R16). */
export type ProductFilters = { category?: string | null; q?: string | null };

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(CATEGORIES);

function matchesText(product: CatalogProduct, needle: string): boolean {
  return [product.name, product.description, ...product.features].some((text) =>
    text.toLowerCase().includes(needle),
  );
}

/** Pure: returns a new array in input order. Unknown or empty category and blank q apply no filter. */
export function filterProducts(products: readonly CatalogProduct[], filters: ProductFilters): CatalogProduct[] {
  const category = filters.category && KNOWN_CATEGORIES.has(filters.category) ? filters.category : null;
  const needle = (filters.q ?? "").trim().toLowerCase();

  return products.filter(
    (product) =>
      (category === null || product.category === category) &&
      (needle === "" || matchesText(product, needle)),
  );
}
