import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// R19: the contentful SDK is always mocked here; no test reaches the network.
const contentful = vi.hoisted(() => {
  const getEntries = vi.fn();
  return {
    getEntries,
    createClient: vi.fn(() => ({ withoutUnresolvableLinks: { getEntries } })),
  };
});
vi.mock("contentful", () => ({ createClient: contentful.createClient }));

import mockData from "@/data/products.mock.json";
import { fetchContentfulProducts } from "@/lib/products/contentful-adapter";
import { productCollectionSchema, type ProductEntry, type Visibility } from "@/schemas/product";

// Typed through the spec contract, so a missing module is the only pre-build type error.
const fetchLive = (sets: readonly Visibility[]): Promise<ProductEntry[]> => fetchContentfulProducts(sets);

const SPACE = "space-abc";
const ENVIRONMENT = "master";
const TOKEN = "token-xyz";

/** Live-shaped response built from the mock file: image URLs rewritten to protocol-relative CDN URLs. */
function liveResponse(items: unknown[] = structuredClone(mockData.items)) {
  const response = structuredClone(mockData) as unknown as { items: unknown[] } & Record<string, unknown>;
  response.items = items.map((raw) => {
    const item = structuredClone(raw) as { fields: { image?: { fields: { file: { url: string } } } } };
    const file = item.fields.image?.fields.file;
    if (file) file.url = `//images.ctfassets.net/space-abc/asset${file.url}`;
    return item;
  });
  response.total = response.items.length;
  return response;
}

const slugsOf = (entries: ProductEntry[]) => entries.map((e) => e.fields.slug);

describe("products/contentful-adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", SPACE);
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", ENVIRONMENT);
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", TOKEN);
    contentful.createClient.mockClear();
    contentful.getEntries.mockReset();
    contentful.getEntries.mockResolvedValue(liveResponse());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("R4: calls createClient with exactly { space, environment, accessToken }", async () => {
    await fetchLive(["public"]);
    expect(contentful.createClient.mock.calls).toStrictEqual([
      [{ space: SPACE, environment: ENVIRONMENT, accessToken: TOKEN }],
    ]);
  });

  it("R4: trims the CONTENTFUL_* values before passing them to createClient", async () => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", `  ${SPACE} `);
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", ` ${ENVIRONMENT}\t`);
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", `${TOKEN}  `);
    await fetchLive(["public"]);
    expect(contentful.createClient).toHaveBeenLastCalledWith({
      space: SPACE,
      environment: ENVIRONMENT,
      accessToken: TOKEN,
    });
  });

  it("R4: reads the CONTENTFUL_* values at call time, not at import", async () => {
    await fetchLive(["public"]);
    vi.stubEnv("CONTENTFUL_SPACE_ID", "space-two");
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", "staging");
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", "token-two");
    await fetchLive(["public"]);
    expect(contentful.createClient).toHaveBeenLastCalledWith({
      space: "space-two",
      environment: "staging",
      accessToken: "token-two",
    });
  });

  it('R4: calls getEntries exactly once with the exact query for ["public"]', async () => {
    await fetchLive(["public"]);
    expect(contentful.getEntries.mock.calls).toStrictEqual([
      [{ content_type: "product", "fields.visibility[in]": "public", order: ["fields.name"] }],
    ]);
  });

  it('R4: calls getEntries exactly once with "public,authenticated" for both sets', async () => {
    await fetchLive(["public", "authenticated"]);
    expect(contentful.getEntries.mock.calls).toStrictEqual([
      [
        {
          content_type: "product",
          "fields.visibility[in]": "public,authenticated",
          order: ["fields.name"],
        },
      ],
    ]);
  });

  it("R5: resolves to the parsed items of the getEntries result", async () => {
    const response = liveResponse();
    contentful.getEntries.mockResolvedValue(response);
    const expected = productCollectionSchema.parse(response).items;
    await expect(fetchLive(["public", "authenticated"])).resolves.toStrictEqual(expected);
  });

  it("R5: returns live image URLs as parsed (no https: prefix added by the adapter)", async () => {
    const entries = await fetchLive(["public", "authenticated"]);
    const bunny = entries.find((e) => e.fields.slug === "cloud-bunny-plush");
    expect(bunny?.fields.image?.fields.file.url).toBe(
      "//images.ctfassets.net/space-abc/asset/products/cloud-bunny-plush.svg",
    );
  });

  it("R5: rejects when the result has no items array", async () => {
    contentful.getEntries.mockResolvedValue({ total: 1, nope: [] });
    await expect(fetchLive(["public"])).rejects.toThrow();
  });

  it("R5: rejects when an item does not parse (invalid slug)", async () => {
    const items = structuredClone(mockData.items) as Array<{ fields: { slug: string } }>;
    items[0].fields.slug = "Not A Slug";
    contentful.getEntries.mockResolvedValue(liveResponse(items));
    await expect(fetchLive(["public", "authenticated"])).rejects.toThrow();
  });

  it("R5: rejects when an item is missing a required field (priceLoggedOut)", async () => {
    const items = structuredClone(mockData.items) as Array<{ fields: Record<string, unknown> }>;
    delete items[1].fields.priceLoggedOut;
    contentful.getEntries.mockResolvedValue(liveResponse(items));
    await expect(fetchLive(["public", "authenticated"])).rejects.toThrow();
  });

  it("R6: drops authenticated entries the API returns for a public-only query", async () => {
    // The API ignores the filter and returns all 12: the adapter must still drop Set B.
    const entries = await fetchLive(["public"]);
    expect(entries).toHaveLength(8);
    expect(entries.every((e) => e.fields.visibility === "public")).toBe(true);
  });

  it("R6: keeps every entry whose visibility is in sets", async () => {
    const entries = await fetchLive(["public", "authenticated"]);
    expect(entries).toHaveLength(12);
  });

  it("R6: [] drops every entry", async () => {
    await expect(fetchLive([])).resolves.toStrictEqual([]);
  });

  it("R6: keeps the remaining entries in the order the API returned them", async () => {
    const reversed = structuredClone(mockData.items).reverse();
    contentful.getEntries.mockResolvedValue(liveResponse(reversed));
    const expected = reversed
      .filter((raw) => raw.fields.visibility === "public")
      .map((raw) => raw.fields.slug);
    expect(slugsOf(await fetchLive(["public"]))).toStrictEqual(expected);
  });
});
