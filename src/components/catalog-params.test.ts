import { describe, expect, expectTypeOf, it } from "vitest";
import { LAYOUTS, SORTS, catalogHref, parseCatalogParams } from "@/components/catalog-params";
import type { CatalogParams, CatalogSort, RawSearchParams } from "@/components/catalog-params";
import { CATEGORIES } from "@/schemas/product";

describe("catalog-params", () => {
  it("R10: LAYOUTS is exactly price then specs", () => {
    expect(LAYOUTS).toEqual(["price", "specs"]);
  });

  it("R10: parseCatalogParams of an empty object returns the defaults", () => {
    expect(parseCatalogParams({})).toEqual({ category: null, q: "", layout: "price", sort: null });
  });

  it("R10: parseCatalogParams accepts every value in CATEGORIES", () => {
    for (const category of CATEGORIES) {
      expect(parseCatalogParams({ category }).category).toBe(category);
    }
  });

  it("R10: parseCatalogParams maps an unknown category to null", () => {
    expect(parseCatalogParams({ category: "robots" }).category).toBeNull();
  });

  it("R10: parseCatalogParams maps an empty category to null", () => {
    expect(parseCatalogParams({ category: "" }).category).toBeNull();
  });

  it("R10: parseCatalogParams matches category case-sensitively (Bath -> null)", () => {
    expect(parseCatalogParams({ category: "Bath" }).category).toBeNull();
  });

  it("R10: parseCatalogParams uses the first element of an array category", () => {
    expect(parseCatalogParams({ category: ["bath", "plush"] }).category).toBe("bath");
  });

  it("R10: parseCatalogParams validates the first element of an array category", () => {
    expect(parseCatalogParams({ category: ["robots", "bath"] }).category).toBeNull();
  });

  it("R10: parseCatalogParams trims q", () => {
    expect(parseCatalogParams({ q: "  soft  " }).q).toBe("soft");
  });

  it("R10: parseCatalogParams returns an empty q when q is missing", () => {
    expect(parseCatalogParams({ category: "bath" }).q).toBe("");
  });

  it("R10: parseCatalogParams uses the first element of an array q", () => {
    expect(parseCatalogParams({ q: ["a", "b"] }).q).toBe("a");
  });

  it("R10: parseCatalogParams returns layout specs only for exactly specs", () => {
    expect(parseCatalogParams({ layout: "specs" }).layout).toBe("specs");
  });

  it("R10: parseCatalogParams maps price, bogus, SPECS and missing layout to price", () => {
    const inputs: RawSearchParams[] = [{ layout: "price" }, { layout: "bogus" }, { layout: "SPECS" }, {}];
    expect(inputs.map((sp) => parseCatalogParams(sp).layout)).toEqual(["price", "price", "price", "price"]);
  });

  it("R10: parseCatalogParams uses the first element of an array layout", () => {
    expect(parseCatalogParams({ layout: ["specs", "price"] }).layout).toBe("specs");
  });

  it("R10: parseCatalogParams ignores unknown keys", () => {
    expect(parseCatalogParams({ category: "bath", q: "duck", layout: "specs", page: "2", sort: ["a", "b"] })).toEqual({
      category: "bath",
      q: "duck",
      layout: "specs",
      sort: null,
    });
  });

  it("R10: parseCatalogParams never throws for undefined values or empty arrays", () => {
    const odd: RawSearchParams = { category: [], q: [], layout: [], extra: undefined };
    expect(() => parseCatalogParams(odd)).not.toThrow();
    expect(parseCatalogParams(odd)).toEqual({ category: null, q: "", layout: "price", sort: null });
  });

  it("R11: catalogHref({}) is /", () => {
    expect(catalogHref({})).toBe("/");
  });

  it("R11: catalogHref with only a category", () => {
    expect(catalogHref({ category: "bath" })).toBe("/?category=bath");
  });

  it("R11: catalogHref orders category, q, layout and encodes spaces as +", () => {
    expect(catalogHref({ category: "bath", q: "soft toy", layout: "specs" })).toBe(
      "/?category=bath&q=soft+toy&layout=specs",
    );
  });

  it("R11: catalogHref keeps the fixed key order whatever the input order", () => {
    expect(catalogHref({ layout: "specs", q: "soft toy", category: "bath" })).toBe(
      "/?category=bath&q=soft+toy&layout=specs",
    );
  });

  it("R11: catalogHref omits a whitespace-only q", () => {
    expect(catalogHref({ q: "  " })).toBe("/");
  });

  it("R11: catalogHref uses the trimmed q", () => {
    expect(catalogHref({ q: "  washable  " })).toBe("/?q=washable");
  });

  it("R11: catalogHref omits the default price layout", () => {
    expect(catalogHref({ layout: "price" })).toBe("/");
  });

  it("R11: catalogHref keeps layout specs", () => {
    expect(catalogHref({ layout: "specs" })).toBe("/?layout=specs");
  });

  it("R11: catalogHref percent-encodes & in q", () => {
    expect(catalogHref({ q: "a&b" })).toBe("/?q=a%26b");
  });

  it("R11: catalogHref omits a null category", () => {
    expect(catalogHref({ category: null, q: "washable", layout: "specs" })).toBe("/?q=washable&layout=specs");
  });

  it("R11: catalogHref round-trips through parseCatalogParams", () => {
    const params = { category: "bath", q: "soft toy", layout: "specs", sort: null } as const;
    const query = new URLSearchParams(catalogHref(params).slice(2));
    expect(parseCatalogParams(Object.fromEntries(query))).toEqual(params);
  });

  // --- P12 (D-038): price sort param --------------------------------------
  it("P12 R1: SORTS is exactly price-asc then price-desc", () => {
    expect(SORTS).toEqual(["price-asc", "price-desc"]);
  });

  it("P12 R1: CatalogSort is the union of the SORTS values", () => {
    expectTypeOf<CatalogSort>().toEqualTypeOf<"price-asc" | "price-desc">();
    expectTypeOf<CatalogParams["sort"]>().toEqualTypeOf<CatalogSort | null>();
  });

  it("P12 R1: parseCatalogParams returns sort price-asc for exactly price-asc", () => {
    expect(parseCatalogParams({ sort: "price-asc" }).sort).toBe("price-asc");
  });

  it("P12 R1: parseCatalogParams returns sort price-desc for exactly price-desc", () => {
    expect(parseCatalogParams({ sort: "price-desc" }).sort).toBe("price-desc");
  });

  it("P12 R1: parseCatalogParams uses the first element of an array sort", () => {
    expect(parseCatalogParams({ sort: ["price-asc", "price-desc"] }).sort).toBe("price-asc");
  });

  it("P12 R1: parseCatalogParams validates the first element of an array sort", () => {
    expect(parseCatalogParams({ sort: ["name", "price-desc"] }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams maps an absent sort to null", () => {
    expect(parseCatalogParams({ category: "bath" }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams maps an empty sort to null", () => {
    expect(parseCatalogParams({ sort: "" }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams maps an unknown sort (name) to null", () => {
    expect(parseCatalogParams({ sort: "name" }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams matches sort case-sensitively (PRICE-ASC -> null)", () => {
    expect(parseCatalogParams({ sort: "PRICE-ASC" }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams maps an empty array sort to null", () => {
    expect(parseCatalogParams({ sort: [] }).sort).toBeNull();
  });

  it("P12 R1: parseCatalogParams returns every field with a valid sort", () => {
    expect(parseCatalogParams({ category: "bath", q: "duck", layout: "specs", sort: "price-desc" })).toEqual({
      category: "bath",
      q: "duck",
      layout: "specs",
      sort: "price-desc",
    });
  });

  it("P12 R2: catalogHref with only sort price-asc", () => {
    expect(catalogHref({ sort: "price-asc" })).toBe("/?sort=price-asc");
  });

  it("P12 R2: catalogHref appends sort last after category, q and layout", () => {
    expect(catalogHref({ category: "bath", q: "duck", layout: "specs", sort: "price-desc" })).toBe(
      "/?category=bath&q=duck&layout=specs&sort=price-desc",
    );
  });

  it("P12 R2: catalogHref keeps sort last whatever the input order", () => {
    expect(catalogHref({ sort: "price-desc", layout: "specs", q: "duck", category: "bath" })).toBe(
      "/?category=bath&q=duck&layout=specs&sort=price-desc",
    );
  });

  it("P12 R2: catalogHref omits a null sort", () => {
    expect(catalogHref({ category: "bath", sort: null })).toBe("/?category=bath");
  });

  it("P12 R2: catalogHref keeps sort when the default price layout is omitted", () => {
    expect(catalogHref({ category: "bath", layout: "price", sort: "price-asc" })).toBe("/?category=bath&sort=price-asc");
  });

  it("P12 R2: catalogHref of a full parsed params object without sort is unchanged", () => {
    expect(catalogHref(parseCatalogParams({ category: "bath", q: "soft toy", layout: "specs" }))).toBe(
      "/?category=bath&q=soft+toy&layout=specs",
    );
  });

  it("P12 R2: catalogHref with sort round-trips through parseCatalogParams", () => {
    const params = { category: "plush", q: "duck", layout: "specs", sort: "price-desc" } as const;
    const query = new URLSearchParams(catalogHref(params).slice(2));
    expect(parseCatalogParams(Object.fromEntries(query))).toEqual(params);
  });
});
