// URL state for the catalog (D-019). Plain isomorphic TypeScript, no @/lib imports,
// so the P05 layout island may import it.
import { CATEGORIES, type Category } from "@/schemas/product";

export const LAYOUTS = ["price", "specs"] as const;
export type CatalogLayout = (typeof LAYOUTS)[number];
export type RawSearchParams = Record<string, string | string[] | undefined>;
export type CatalogParams = { category: Category | null; q: string; layout: CatalogLayout };

const KNOWN_CATEGORIES: ReadonlySet<string> = new Set(CATEGORIES);

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function isCategory(value: string | undefined): value is Category {
  return value !== undefined && KNOWN_CATEGORIES.has(value);
}

/** Validates awaited searchParams. Unknown keys and unknown category/layout values are ignored. */
export function parseCatalogParams(searchParams: RawSearchParams): CatalogParams {
  const category = first(searchParams.category);
  const q = first(searchParams.q);
  const layout = first(searchParams.layout);
  return {
    category: isCategory(category) ? category : null,
    q: (q ?? "").trim(),
    layout: layout === "specs" ? "specs" : "price",
  };
}

/** Canonical catalog URL: keys in the order category, q, layout; defaults omitted. */
export function catalogHref(params: Partial<CatalogParams>): string {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  const q = params.q?.trim();
  if (q) query.set("q", q);
  if (params.layout === "specs") query.set("layout", "specs");
  const search = query.toString();
  return search === "" ? "/" : `/?${search}`;
}
