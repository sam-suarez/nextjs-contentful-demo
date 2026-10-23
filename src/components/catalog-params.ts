// URL state for the catalog (D-019). Plain isomorphic TypeScript, no @/lib imports,
// so the P05 layout island may import it.
import { CATEGORIES, type Category } from "@/schemas/product";

export const LAYOUTS = ["price", "specs"] as const;
export type CatalogLayout = (typeof LAYOUTS)[number];
/** Price sort options (D-038), in control order. No sort means name order. */
export const SORTS = ["price-asc", "price-desc"] as const;
export type CatalogSort = (typeof SORTS)[number];
export type RawSearchParams = Record<string, string | string[] | undefined>;
export type CatalogParams = { category: Category | null; q: string; layout: CatalogLayout; sort: CatalogSort | null };

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(CATEGORIES);

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function isCategory(value: string | undefined): value is Category {
  return value !== undefined && KNOWN_CATEGORIES.has(value);
}

function isSort(value: string | undefined): value is CatalogSort {
  return value === "price-asc" || value === "price-desc";
}

/** Validates awaited searchParams. Unknown keys and unknown category/layout/sort values are ignored. */
export function parseCatalogParams(searchParams: RawSearchParams): CatalogParams {
  const category = first(searchParams.category);
  const q = first(searchParams.q);
  const layout = first(searchParams.layout);
  const sort = first(searchParams.sort);
  return {
    category: isCategory(category) ? category : null,
    q: (q ?? "").trim(),
    layout: layout === "specs" ? "specs" : "price",
    sort: isSort(sort) ? sort : null,
  };
}

/** Canonical catalog URL: keys in the order category, q, layout, sort; defaults omitted. */
export function catalogHref(params: Partial<CatalogParams>): string {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  const q = params.q?.trim();
  if (q) query.set("q", q);
  if (params.layout === "specs") query.set("layout", "specs");
  if (params.sort && isSort(params.sort)) query.set("sort", params.sort);
  const search = query.toString();
  return search === "" ? "/" : `/?${search}`;
}
