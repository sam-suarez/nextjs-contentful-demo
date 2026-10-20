import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import mock from "@/data/products.mock.json";
import { productCollectionSchema } from "@/schemas/product";

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

describe("products.mock.json", () => {
  const { items } = productCollectionSchema.parse(mock);

  it("parses with the product schema", () => {
    expect(items).toHaveLength(12);
  });

  it("has 8 public (Set A) and 4 authenticated (Set B) products", () => {
    expect(items.filter((p) => p.fields.visibility === "public")).toHaveLength(8);
    expect(items.filter((p) => p.fields.visibility === "authenticated")).toHaveLength(4);
  });

  it("has unique slugs", () => {
    const slugs = items.map((p) => p.fields.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never prices the member price above the logged-out price", () => {
    for (const { fields } of items) {
      expect(fields.priceAuthenticated).toBeLessThanOrEqual(fields.priceLoggedOut);
    }
  });

  it("keeps exactly one product without an image, for the fallback", () => {
    const withoutImage = items.filter((p) => !p.fields.image).map((p) => p.fields.slug);
    expect(withoutImage).toEqual(["bubble-bath-whale"]);
  });

  it("points every image at a local file in public/products", () => {
    for (const { fields } of items) {
      if (!fields.image) continue;
      const { url } = fields.image.fields.file;
      expect(url).toMatch(/^\/products\/[a-z0-9-]+\.svg$/);
      expect(existsSync(`${publicDir}${url}`)).toBe(true);
    }
  });
});
