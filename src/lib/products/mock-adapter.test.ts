import "server-only";
import { describe, expect, it, vi } from "vitest";

const contentful = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("contentful", () => contentful);

import mockData from "@/data/products.mock.json";
import { fetchMockProducts } from "@/lib/products/mock-adapter";
import {
  productCollectionSchema,
  productEntrySchema,
  type ProductEntry,
  type Visibility,
} from "@/schemas/product";

// Typed through the spec contract, so a missing module is the only pre-build type error.
const fetchMock = (sets: readonly Visibility[]): Promise<ProductEntry[]> => fetchMockProducts(sets);

const parsed = productCollectionSchema.parse(mockData).items;
const byName = (a: ProductEntry, b: ProductEntry) => a.fields.name.localeCompare(b.fields.name, "en");
const expectedPublic = parsed.filter((e) => e.fields.visibility === "public").sort(byName);
const expectedAll = [...parsed].sort(byName);

const AUTHENTICATED_SLUGS = [
  "forest-friends-activity-cube",
  "heirloom-wooden-xylophone",
  "moonbeam-musical-mobile",
  "sensory-crinkle-book-set",
];

describe("products/mock-adapter", () => {
  it('R3: ["public"] resolves to the 8 public entries', async () => {
    const entries = await fetchMock(["public"]);
    expect(entries).toHaveLength(8);
    expect(entries.every((e) => e.fields.visibility === "public")).toBe(true);
  });

  it('R3: ["public"] never includes an authenticated entry', async () => {
    const slugs = (await fetchMock(["public"])).map((e) => e.fields.slug);
    for (const slug of AUTHENTICATED_SLUGS) expect(slugs).not.toContain(slug);
  });

  it('R3: ["public", "authenticated"] resolves to all 12 entries', async () => {
    const entries = await fetchMock(["public", "authenticated"]);
    expect(entries).toHaveLength(12);
  });

  it("R3: [] resolves to []", async () => {
    await expect(fetchMock([])).resolves.toStrictEqual([]);
  });

  it('R3: ["public"] entries are the parsed entries sorted by name (localeCompare "en")', async () => {
    await expect(fetchMock(["public"])).resolves.toStrictEqual(expectedPublic);
  });

  it('R3: ["public", "authenticated"] entries are the parsed entries sorted by name', async () => {
    await expect(fetchMock(["public", "authenticated"])).resolves.toStrictEqual(expectedAll);
  });

  it("R3: Set B entries are mixed into name order, not appended", async () => {
    const slugs = (await fetchMock(["public", "authenticated"])).map((e) => e.fields.slug);
    expect(slugs.slice(0, 3)).toStrictEqual([
      "bubble-bath-whale",
      "cloud-bunny-plush",
      "forest-friends-activity-cube",
    ]);
  });

  it("R3: every returned entry parses as a ProductEntry", async () => {
    const entries = await fetchMock(["public", "authenticated"]);
    for (const entry of entries) expect(productEntrySchema.safeParse(entry).success).toBe(true);
  });

  it("R3: image URLs are returned unchanged as /products/<file>.svg", async () => {
    const entries = await fetchMock(["public", "authenticated"]);
    const bunny = entries.find((e) => e.fields.slug === "cloud-bunny-plush");
    expect(bunny?.fields.image?.fields.file.url).toBe("/products/cloud-bunny-plush.svg");
    for (const entry of entries) {
      if (entry.fields.image) expect(entry.fields.image.fields.file.url).toMatch(/^\/products\/[a-z0-9-]+\.svg$/);
    }
  });

  it("R3: bubble-bath-whale is returned without an image", async () => {
    const entries = await fetchMock(["public"]);
    const whale = entries.find((e) => e.fields.slug === "bubble-bath-whale");
    expect(whale).toBeDefined();
    expect(whale?.fields.image).toBeUndefined();
  });

  it("R3: sorts by name itself, not by the JSON file's order (file reversed)", async () => {
    vi.resetModules();
    vi.doMock("@/data/products.mock.json", async (importOriginal) => {
      const actual = await importOriginal<{ default: typeof mockData }>();
      const reversed = { ...actual.default, items: [...actual.default.items].reverse() };
      return { ...actual, ...reversed, default: reversed };
    });
    try {
      const fresh = await import("@/lib/products/mock-adapter");
      const fetchFresh = (sets: readonly Visibility[]): Promise<ProductEntry[]> => fresh.fetchMockProducts(sets);
      const slugs = (await fetchFresh(["public", "authenticated"])).map((e) => e.fields.slug);
      expect(slugs).toStrictEqual(expectedAll.map((e) => e.fields.slug));
    } finally {
      vi.doUnmock("@/data/products.mock.json");
      vi.resetModules();
    }
  });

  it("R3: never calls contentful", async () => {
    await fetchMock(["public"]);
    await fetchMock(["public", "authenticated"]);
    expect(contentful.createClient).not.toHaveBeenCalled();
  });
});
