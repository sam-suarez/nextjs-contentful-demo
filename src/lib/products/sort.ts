import "server-only";

import type { CatalogProduct } from "@/lib/products/types";

export type PriceSort = "price-asc" | "price-desc";

export const PRICE_SORTS: readonly PriceSort[] = Object.freeze(["price-asc", "price-desc"] as const);

/** Reads only `price` and `name` (R6): the order holds nothing beyond the price the DAL resolved. */
function compare(a: CatalogProduct, b: CatalogProduct, sort: PriceSort): number {
  const byPrice = sort === "price-asc" ? a.price - b.price : b.price - a.price;
  // Ties fall back to name A-Z in both directions (D-038 I3), the mock adapter's name order.
  return byPrice !== 0 ? byPrice : a.name.localeCompare(b.name, "en");
}

/** Indices into `products` in `sort` order; equal price and name keep input order (index tie-break). */
function orderFor(products: readonly CatalogProduct[], sort: PriceSort): number[] {
  return products
    .map((_, index) => index)
    .sort((i, j) => compare(products[i], products[j], sort) || i - j);
}

function isPriceSort(value: unknown): value is PriceSort {
  return value === "price-asc" || value === "price-desc";
}

/** Pure. New array; price asc/desc, ties by name A–Z ("en"), then input order. null/undefined/unknown → input order. */
export function sortProducts(products: readonly CatalogProduct[], sort: PriceSort | null | undefined): CatalogProduct[] {
  if (!isPriceSort(sort)) return [...products];
  return orderFor(products, sort).map((index) => products[index]);
}

/** Pure. For each option, indices into `products` giving that option's order. */
export function priceSortOrders(products: readonly CatalogProduct[]): Record<PriceSort, number[]> {
  return {
    "price-asc": orderFor(products, "price-asc"),
    "price-desc": orderFor(products, "price-desc"),
  };
}
