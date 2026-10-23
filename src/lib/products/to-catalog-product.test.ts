import "server-only";
import { describe, expect, it } from "vitest";

import mockData from "@/data/products.mock.json";
import { toCatalogProduct } from "@/lib/products/to-catalog-product";
import type { CatalogProduct, PriceTier } from "@/lib/products/types";
import { productCollectionSchema, type ProductEntry } from "@/schemas/product";

// P09 contract field. The intersection keeps pre-build typecheck clean (CatalogProduct lacks it
// until the build); post-build it is the same type.
type CatalogProductWithSavings = CatalogProduct & { savingsPercent: number | null };

// Typed through the spec contract, so a missing module is the only pre-build type error.
const toProduct = (entry: ProductEntry, tier: PriceTier): CatalogProductWithSavings =>
  toCatalogProduct(entry, tier) as CatalogProductWithSavings;

const entries = productCollectionSchema.parse(mockData).items;

/** A fresh deep copy of the parsed mock entry with this slug. */
function entry(slug: string): ProductEntry {
  const found = entries.find((e) => e.fields.slug === slug);
  if (!found) throw new Error(`fixture: no mock entry ${slug}`);
  return structuredClone(found);
}

/** cloud-bunny-plush with its image asset URL replaced. */
function bunnyWithImageUrl(url: string): ProductEntry {
  const e = entry("cloud-bunny-plush");
  e.fields.image!.fields.file.url = url;
  return e;
}

const CATALOG_KEYS = [
  "id",
  "slug",
  "name",
  "category",
  "visibility",
  "description",
  "ageRange",
  "material",
  "features",
  "image",
  "price",
  "priceTier",
  "savingsPercent", // P09 R3
].sort();

describe("products/to-catalog-product", () => {
  it("R7: own keys are exactly the CatalogProduct keys", () => {
    const product = toProduct(entry("cloud-bunny-plush"), "everyday");
    expect(Object.keys(product).sort()).toStrictEqual(CATALOG_KEYS);
  });

  it("R7: own keys are exactly the CatalogProduct keys for an entry without an image", () => {
    const product = toProduct(entry("bubble-bath-whale"), "member");
    expect(Object.keys(product).sort()).toStrictEqual(CATALOG_KEYS);
  });

  it("R7: has no sys, fields, priceLoggedOut or priceAuthenticated key", () => {
    const product = toProduct(entry("cloud-bunny-plush"), "member");
    for (const key of ["sys", "fields", "priceLoggedOut", "priceAuthenticated"]) {
      expect(Object.prototype.hasOwnProperty.call(product, key)).toBe(false);
    }
  });

  it("R7: maps cloud-bunny-plush everyday to the full expected CatalogProduct", () => {
    const e = entry("cloud-bunny-plush");
    const f = e.fields;
    expect(toProduct(e, "everyday")).toStrictEqual({
      id: "2EUhZptoIxVcTXRY6b9iEn",
      slug: "cloud-bunny-plush",
      name: "Cloud Bunny Plush",
      category: "plush",
      visibility: "public",
      description: f.description,
      ageRange: f.ageRange,
      material: f.material,
      features: f.features,
      image: {
        url: "/products/cloud-bunny-plush.svg",
        alt: f.image!.fields.description,
        width: 400,
        height: 400,
      },
      price: 28,
      priceTier: "everyday",
      savingsPercent: null,
    });
  });

  it("R7: id is entry.sys.id", () => {
    const e = entry("heirloom-wooden-xylophone");
    expect(toProduct(e, "member").id).toBe(e.sys.id);
  });

  it("R7: text fields are copied from entry.fields", () => {
    const e = entry("heirloom-wooden-xylophone");
    const p = toProduct(e, "member");
    const { slug, name, category, visibility, description, ageRange, material } = e.fields;
    expect({
      slug: p.slug,
      name: p.name,
      category: p.category,
      visibility: p.visibility,
      description: p.description,
      ageRange: p.ageRange,
      material: p.material,
    }).toStrictEqual({ slug, name, category, visibility, description, ageRange, material });
  });

  it('R7: tier "everyday" sets price to priceLoggedOut (cloud-bunny-plush → 28)', () => {
    const p = toProduct(entry("cloud-bunny-plush"), "everyday");
    expect(p.price).toBe(28);
    expect(p.priceTier).toBe("everyday");
  });

  it('R7: tier "member" sets price to priceAuthenticated (cloud-bunny-plush → 22.4)', () => {
    const p = toProduct(entry("cloud-bunny-plush"), "member");
    expect(p.price).toBe(22.4);
    expect(p.priceTier).toBe("member");
  });

  it("R7: price follows the tier for every mock entry", () => {
    for (const e of entries) {
      expect(toProduct(e, "everyday").price).toBe(e.fields.priceLoggedOut);
      expect(toProduct(e, "member").price).toBe(e.fields.priceAuthenticated);
    }
  });

  it("R7: features is a new array equal to entry.fields.features", () => {
    const e = entry("cloud-bunny-plush");
    const p = toProduct(e, "everyday");
    expect(p.features).toStrictEqual(e.fields.features);
    expect(p.features).not.toBe(e.fields.features);
  });

  it("R7: features is [] when the entry has none", () => {
    const e = entry("jingle-ball-trio");
    delete e.fields.features;
    expect(toProduct(e, "everyday").features).toStrictEqual([]);
  });

  it("R8: image is null when entry.fields.image is absent (bubble-bath-whale)", () => {
    expect(toProduct(entry("bubble-bath-whale"), "everyday").image).toBeNull();
  });

  it("R8: image is exactly { url, alt, width, height } from the asset", () => {
    const e = entry("cloud-bunny-plush");
    expect(toProduct(e, "everyday").image).toStrictEqual({
      url: "/products/cloud-bunny-plush.svg",
      alt: e.fields.image!.fields.description,
      width: 400,
      height: 400,
    });
  });

  it("R8: alt falls back to the asset title when description is absent", () => {
    const e = entry("cloud-bunny-plush");
    delete e.fields.image!.fields.description;
    expect(toProduct(e, "everyday").image?.alt).toBe(e.fields.image!.fields.title);
  });

  it("R8: alt prefers the asset description over the title", () => {
    const e = entry("cloud-bunny-plush");
    e.fields.image!.fields.title = "Asset title";
    e.fields.image!.fields.description = "Asset description";
    expect(toProduct(e, "everyday").image?.alt).toBe("Asset description");
  });

  it("R8: width and height are null when file.details.image is absent", () => {
    const e = entry("cloud-bunny-plush");
    delete e.fields.image!.fields.file.details.image;
    const image = toProduct(e, "everyday").image;
    expect(image?.width).toBeNull();
    expect(image?.height).toBeNull();
  });

  it("R8: width and height come from file.details.image", () => {
    const e = entry("cloud-bunny-plush");
    e.fields.image!.fields.file.details.image = { width: 640, height: 480 };
    const image = toProduct(e, "everyday").image;
    expect(image?.width).toBe(640);
    expect(image?.height).toBe(480);
  });

  it("R8: a protocol-relative // URL gets an https: prefix", () => {
    const p = toProduct(bunnyWithImageUrl("//images.ctfassets.net/a/b/c.svg"), "everyday");
    expect(p.image?.url).toBe("https://images.ctfassets.net/a/b/c.svg");
  });

  it("R8: a root-relative /products/ URL is unchanged", () => {
    const p = toProduct(bunnyWithImageUrl("/products/cloud-bunny-plush.svg"), "everyday");
    expect(p.image?.url).toBe("/products/cloud-bunny-plush.svg");
  });

  it("R8: an https:// URL is unchanged", () => {
    const p = toProduct(bunnyWithImageUrl("https://images.ctfassets.net/a/b/c.svg"), "everyday");
    expect(p.image?.url).toBe("https://images.ctfassets.net/a/b/c.svg");
  });

  // P09: savingsPercent

  it("P09 R3: the key set is exactly the 12 earlier keys plus savingsPercent, for both tiers", () => {
    const expectedKeys = [
      "ageRange", "category", "description", "features", "id", "image", "material", "name",
      "price", "priceTier", "savingsPercent", "slug", "visibility",
    ];
    for (const slug of ["cloud-bunny-plush", "bubble-bath-whale", "heirloom-wooden-xylophone"]) {
      for (const tier of ["everyday", "member"] as const) {
        expect(Object.keys(toProduct(entry(slug), tier)).sort(), `${slug} ${tier}`).toStrictEqual(expectedKeys);
      }
    }
  });

  it('P09 R4: tier "member" gives savingsPercent 20 for every mock entry', () => {
    for (const e of entries) {
      expect(toProduct(e, "member").savingsPercent, e.fields.slug).toBe(20);
    }
  });

  it('P09 R4: tier "everyday" gives savingsPercent null for every mock entry', () => {
    for (const e of entries) {
      expect(toProduct(e, "everyday").savingsPercent, e.fields.slug).toBeNull();
    }
  });

  it('P09 R4: tier "member" computes from priceLoggedOut and priceAuthenticated (3 → 1 gives 67)', () => {
    const e = entry("cloud-bunny-plush");
    e.fields.priceLoggedOut = 3;
    e.fields.priceAuthenticated = 1;
    const p = toProduct(e, "member");
    expect(p.savingsPercent).toBe(67);
    expect(p.price).toBe(1);
  });

  it('P09 R4: tier "member" computes from priceLoggedOut and priceAuthenticated (200 → 130 gives 35)', () => {
    const e = entry("heirloom-wooden-xylophone");
    e.fields.priceLoggedOut = 200;
    e.fields.priceAuthenticated = 130;
    expect(toProduct(e, "member").savingsPercent).toBe(35);
  });

  it('P09 R4: tier "member" with equal prices gives savingsPercent null', () => {
    const e = entry("cloud-bunny-plush");
    e.fields.priceLoggedOut = 10;
    e.fields.priceAuthenticated = 10;
    expect(toProduct(e, "member").savingsPercent).toBeNull();
  });

  it('P09 R4: tier "member" with a higher member price gives savingsPercent null', () => {
    const e = entry("cloud-bunny-plush");
    e.fields.priceLoggedOut = 10;
    e.fields.priceAuthenticated = 12;
    expect(toProduct(e, "member").savingsPercent).toBeNull();
  });

  it('P09 R4: tier "member" with a saving under 0.5% gives savingsPercent null (100 → 99.7)', () => {
    const e = entry("cloud-bunny-plush");
    e.fields.priceLoggedOut = 100;
    e.fields.priceAuthenticated = 99.7;
    expect(toProduct(e, "member").savingsPercent).toBeNull();
  });

  it('P09 R4: tier "member" with an everyday price of 0 gives savingsPercent null', () => {
    const e = entry("cloud-bunny-plush");
    e.fields.priceLoggedOut = 0;
    e.fields.priceAuthenticated = 0;
    expect(toProduct(e, "member").savingsPercent).toBeNull();
  });

  it('P09 R4: tier "everyday" stays null whatever priceAuthenticated is (1, 0, 130, 1000)', () => {
    for (const memberPrice of [1, 0, 130, 1000]) {
      const e = entry("cloud-bunny-plush");
      e.fields.priceLoggedOut = 200;
      e.fields.priceAuthenticated = memberPrice;
      const p = toProduct(e, "everyday");
      expect(p.savingsPercent, String(memberPrice)).toBeNull();
      expect(p.price).toBe(200);
    }
  });
});
