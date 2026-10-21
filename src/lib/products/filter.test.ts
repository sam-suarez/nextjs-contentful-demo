import "server-only";
import { describe, expect, it } from "vitest";

import mockData from "@/data/products.mock.json";
import { filterProducts, type ProductFilters } from "@/lib/products/filter";
import type { CatalogProduct } from "@/lib/products/types";
import { CATEGORIES, productCollectionSchema, type ProductEntry } from "@/schemas/product";

// Typed through the spec contract, so a missing module is the only pre-build type error.
const filter = (products: readonly CatalogProduct[], filters: ProductFilters): CatalogProduct[] =>
  filterProducts(products, filters);

// CatalogProduct fixtures built here from the mock entries (not through toCatalogProduct),
// so this file tests filterProducts alone.
function catalog(e: ProductEntry, tier: "everyday" | "member"): CatalogProduct {
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
  };
}

const sorted = productCollectionSchema
  .parse(mockData)
  .items.sort((a, b) => a.fields.name.localeCompare(b.fields.name, "en"));
const ALL_12 = sorted.map((e) => catalog(e, "member"));
const PUBLIC_8 = sorted.filter((e) => e.fields.visibility === "public").map((e) => catalog(e, "everyday"));
const ALL_SLUGS = ALL_12.map((p) => p.slug);

const slugs = (products: CatalogProduct[]) => products.map((p) => p.slug);
const deepFreeze = (products: CatalogProduct[]) =>
  Object.freeze(
    products.map((p) => Object.freeze({ ...p, features: Object.freeze([...p.features]) })),
  ) as unknown as readonly CatalogProduct[];

describe("products/filter", () => {
  it("R16: fixture sanity: 12 and 8 products, all categories known", () => {
    expect(ALL_12).toHaveLength(12);
    expect(PUBLIC_8).toHaveLength(8);
    for (const p of ALL_12) expect(CATEGORIES).toContain(p.category);
  });

  it("R16: all 12 with {} returns all 12 in the same order", () => {
    expect(slugs(filter(ALL_12, {}))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: returns a new array, even when nothing is filtered out", () => {
    const input = [...ALL_12];
    expect(filter(input, {})).not.toBe(input);
    expect(filter(input, { category: null, q: null })).not.toBe(input);
  });

  it("R16: never mutates the input array or its products", () => {
    const input = [...ALL_12];
    const before = structuredClone(input);
    filter(input, { category: "musical", q: "jingle" });
    filter(input, { q: "  WASHABLE " });
    expect(input).toStrictEqual(before);
  });

  it("R16: works on a frozen input (no in-place sort or splice)", () => {
    const frozen = deepFreeze(ALL_12);
    expect(slugs(filter(frozen, { category: "bath" }))).toStrictEqual([
      "bubble-bath-whale",
      "sunny-duck-bath-squirter",
    ]);
    expect(slugs(filter(frozen, {}))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: returns the input product objects with their values unchanged", () => {
    const result = filter(ALL_12, { category: "plush" });
    expect(result).toStrictEqual(ALL_12.filter((p) => p.category === "plush"));
  });

  it('R16: all 12, { category: "bath" } → bubble-bath-whale, sunny-duck-bath-squirter', () => {
    expect(slugs(filter(ALL_12, { category: "bath" }))).toStrictEqual([
      "bubble-bath-whale",
      "sunny-duck-bath-squirter",
    ]);
  });

  it('R16: all 12, { category: "musical" } → xylophone, jingle-ball-trio, moonbeam mobile', () => {
    expect(slugs(filter(ALL_12, { category: "musical" }))).toStrictEqual([
      "heirloom-wooden-xylophone",
      "jingle-ball-trio",
      "moonbeam-musical-mobile",
    ]);
  });

  it('R16: public 8, { category: "musical" } → jingle-ball-trio', () => {
    expect(slugs(filter(PUBLIC_8, { category: "musical" }))).toStrictEqual(["jingle-ball-trio"]);
  });

  it('R16: unknown category "robots" applies no category filter', () => {
    expect(slugs(filter(ALL_12, { category: "robots" }))).toStrictEqual(ALL_SLUGS);
  });

  it('R16: category "" applies no category filter', () => {
    expect(slugs(filter(ALL_12, { category: "" }))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: category null applies no category filter", () => {
    expect(slugs(filter(ALL_12, { category: null }))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: category undefined applies no category filter", () => {
    expect(slugs(filter(ALL_12, { category: undefined }))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: every value in CATEGORIES keeps only products of that category", () => {
    for (const category of CATEGORIES) {
      const result = filter(ALL_12, { category });
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((p) => p.category === category)).toBe(true);
      expect(slugs(result)).toStrictEqual(slugs(ALL_12.filter((p) => p.category === category)));
    }
  });

  it('R16: all 12, { q: "  WASHABLE " } (features match) → cloud-bunny-plush, sensory-crinkle-book-set', () => {
    expect(slugs(filter(ALL_12, { q: "  WASHABLE " }))).toStrictEqual([
      "cloud-bunny-plush",
      "sensory-crinkle-book-set",
    ]);
  });

  it('R16: public 8, { q: "washable" } → cloud-bunny-plush', () => {
    expect(slugs(filter(PUBLIC_8, { q: "washable" }))).toStrictEqual(["cloud-bunny-plush"]);
  });

  it('R16: all 12, { q: "tub" } (description-only match) → bubble-bath-whale', () => {
    expect(slugs(filter(ALL_12, { q: "tub" }))).toStrictEqual(["bubble-bath-whale"]);
  });

  it('R16: all 12, { q: "Bath" } (name match) → bubble-bath-whale, sunny-duck-bath-squirter', () => {
    expect(slugs(filter(ALL_12, { q: "Bath" }))).toStrictEqual([
      "bubble-bath-whale",
      "sunny-duck-bath-squirter",
    ]);
  });

  it('R16: all 12, { q: "freezer" } → starlight-teether-ring', () => {
    expect(slugs(filter(ALL_12, { q: "freezer" }))).toStrictEqual(["starlight-teether-ring"]);
  });

  it('R16: public 8, { q: "lullab" } → empty', () => {
    expect(filter(PUBLIC_8, { q: "lullab" })).toStrictEqual([]);
  });

  it('R16: q "   " applies no text filter', () => {
    expect(slugs(filter(ALL_12, { q: "   " }))).toStrictEqual(ALL_SLUGS);
  });

  it('R16: q "" applies no text filter', () => {
    expect(slugs(filter(ALL_12, { q: "" }))).toStrictEqual(ALL_SLUGS);
  });

  it("R16: q null applies no text filter", () => {
    expect(slugs(filter(ALL_12, { q: null }))).toStrictEqual(ALL_SLUGS);
  });

  it('R16: all 12, { category: "plush", q: "washable" } → cloud-bunny-plush', () => {
    expect(slugs(filter(ALL_12, { category: "plush", q: "washable" }))).toStrictEqual(["cloud-bunny-plush"]);
  });

  it('R16: all 12, { category: "bath", q: "washable" } → empty (AND)', () => {
    expect(filter(ALL_12, { category: "bath", q: "washable" })).toStrictEqual([]);
  });

  it('R16: all 12, { q: "zzz" } → empty', () => {
    expect(filter(ALL_12, { q: "zzz" })).toStrictEqual([]);
  });

  it.each([
    { q: "vinyl", field: "material" },
    { q: "polyester", field: "material" },
    { q: "months", field: "ageRange" },
    { q: "stacking-sorting", field: "category" },
    { q: "2EUhZ", field: "id" },
  ])('R16: q "$q" (only in $field) matches nothing: q searches name, description, features only', ({ q }) => {
    expect(filter(ALL_12, { q })).toStrictEqual([]);
  });
});
