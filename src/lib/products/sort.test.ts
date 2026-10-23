import "server-only";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

// getProducts() (R9) runs the real DAL on the mock source; next/headers, next/cache, React cache
// and contentful are stubbed exactly as in dal.test.ts so no request scope or network is needed.
const mocks = vi.hoisted(() => {
  const cookieGet = vi.fn();
  return {
    cookieGet,
    cookies: vi.fn(async () => ({ get: cookieGet })),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    cache: vi.fn(<T extends (...args: never[]) => unknown>(fn: T): T => fn),
    createClient: vi.fn(() => {
      throw new Error("contentful must not be called in sort tests");
    }),
  };
});

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ cacheLife: mocks.cacheLife, cacheTag: mocks.cacheTag }));
vi.mock("contentful", () => ({ createClient: mocks.createClient }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: mocks.cache };
});

import { getProducts } from "@/lib/dal";
import * as sortModule from "@/lib/products/sort";
import type { CatalogProduct } from "@/lib/products/types";
import { SESSION_COOKIE, signSession } from "@/lib/session";

// Typed through the spec contract, so a missing module is the only pre-build type error.
type PriceSort = sortModule.PriceSort;
type ContractSort = "price-asc" | "price-desc";
const contractPriceSorts = sortModule.PRICE_SORTS;
const PRICE_SORTS: readonly ContractSort[] = contractPriceSorts;
const sortProducts = (
  products: readonly CatalogProduct[],
  sort: ContractSort | null | undefined,
): CatalogProduct[] => sortModule.sortProducts(products, sort);
const priceSortOrders = (products: readonly CatalogProduct[]): Record<ContractSort, number[]> =>
  sortModule.priceSortOrders(products);

const SECRET = "sort-test-secret-0123456789-abcdefghij"; // > 32 chars

// Spec contract, "Expected data qa asserts on".
const SIGNED_OUT_ASC: Array<[string, number]> = [
  ["sunny-duck-bath-squirter", 9],
  ["starlight-teether-ring", 11],
  ["ocean-wave-rattle", 12],
  ["bubble-bath-whale", 14],
  ["jingle-ball-trio", 16],
  ["rainbow-ring-stacker", 24],
  ["cloud-bunny-plush", 28],
  ["shape-sorter-cube", 32],
];
const SIGNED_IN_ASC: Array<[string, number]> = [
  ["sunny-duck-bath-squirter", 7.2],
  ["starlight-teether-ring", 8.8],
  ["ocean-wave-rattle", 9.6],
  ["bubble-bath-whale", 11.2],
  ["jingle-ball-trio", 12.8],
  ["rainbow-ring-stacker", 19.2],
  ["cloud-bunny-plush", 22.4],
  ["shape-sorter-cube", 25.6],
  ["sensory-crinkle-book-set", 28.8],
  ["heirloom-wooden-xylophone", 43.2],
  ["moonbeam-musical-mobile", 54.4],
  ["forest-friends-activity-cube", 71.2],
];
const SIGNED_OUT_NAME_ORDER = [
  "bubble-bath-whale",
  "cloud-bunny-plush",
  "jingle-ball-trio",
  "ocean-wave-rattle",
  "rainbow-ring-stacker",
  "shape-sorter-cube",
  "starlight-teether-ring",
  "sunny-duck-bath-squirter",
];

let fixtureSeq = 0;

/** A hand-built CatalogProduct; any field not given gets a unique filler value. */
function product(fields: Partial<CatalogProduct> & Pick<CatalogProduct, "name" | "price">): CatalogProduct {
  const n = ++fixtureSeq;
  return {
    id: `id-${n}`,
    slug: `slug-${n}`,
    category: "plush",
    visibility: "public",
    description: `description ${n}`,
    ageRange: "0-12 months",
    material: "cotton",
    features: [],
    image: null,
    priceTier: "everyday",
    savingsPercent: null,
    ...fields,
  };
}

/** Indices into `input` of each element of `output`, matched by reference (-1 if not from input). */
const indicesOf = (input: readonly CatalogProduct[], output: readonly CatalogProduct[]) =>
  output.map((p) => input.indexOf(p));

const slugPrice = (list: readonly CatalogProduct[]) => list.map((p): [string, number] => [p.slug, p.price]);

function setSessionCookie(value: string | undefined) {
  mocks.cookieGet.mockImplementation((name: string) =>
    name === SESSION_COOKIE && value !== undefined ? { name, value } : undefined,
  );
}

async function signedOutProducts(): Promise<CatalogProduct[]> {
  setSessionCookie(undefined);
  return getProducts();
}

async function signedInProducts(): Promise<CatalogProduct[]> {
  setSessionCookie(await signSession("sort-tester"));
  return getProducts();
}

/** Distinct prices, deliberately in neither price nor name order. */
function scrambled(): CatalogProduct[] {
  return [
    product({ name: "Delta", price: 30 }),
    product({ name: "Alpha", price: 5.5 }),
    product({ name: "Echo", price: 100 }),
    product({ name: "Bravo", price: 12 }),
    product({ name: "Charlie", price: 0 }),
  ];
}

describe("sort", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("CONTENTFUL_SPACE_ID", "");
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", "");
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", "");
    vi.spyOn(console, "info").mockImplementation(() => {});
    setSessionCookie(undefined);
  });

  // R1
  it("R1: exports exactly PRICE_SORTS, sortProducts and priceSortOrders at runtime", () => {
    expect(Object.keys(sortModule).sort()).toEqual(["PRICE_SORTS", "priceSortOrders", "sortProducts"]);
  });

  it('R1: PriceSort is exactly "price-asc" | "price-desc"', () => {
    expectTypeOf<PriceSort>().toEqualTypeOf<"price-asc" | "price-desc">();
    expectTypeOf(contractPriceSorts).toEqualTypeOf<readonly PriceSort[]>();
  });

  it('R1: PRICE_SORTS is exactly ["price-asc", "price-desc"], in that order', () => {
    expect([...contractPriceSorts]).toEqual(["price-asc", "price-desc"]);
  });

  // R2
  it('R2: sortProducts(products, "price-asc") orders by price ascending', () => {
    const input = scrambled();
    expect(sortProducts(input, "price-asc").map((p) => p.price)).toEqual([0, 5.5, 12, 30, 100]);
  });

  it('R2: sortProducts(products, "price-desc") orders by price descending', () => {
    const input = scrambled();
    expect(sortProducts(input, "price-desc").map((p) => p.price)).toEqual([100, 30, 12, 5.5, 0]);
  });

  it("R2: the result holds the input's own product objects, each exactly once", () => {
    const input = scrambled();
    for (const option of PRICE_SORTS) {
      expect([...indicesOf(input, sortProducts(input, option))].sort()).toEqual([0, 1, 2, 3, 4]);
    }
  });

  // R3
  it('R3: equal prices fall back to name A-Z ("en") in price-asc', () => {
    const input = [
      product({ name: "Zebra", price: 10 }),
      product({ name: "apple", price: 10 }),
      product({ name: "Mango", price: 5 }),
    ];
    expect(sortProducts(input, "price-asc").map((p) => p.name)).toEqual(["Mango", "apple", "Zebra"]);
  });

  it('R3: equal prices still fall back to name A-Z ("en") in price-desc (tie order not reversed)', () => {
    const input = [
      product({ name: "Zebra", price: 10 }),
      product({ name: "apple", price: 10 }),
      product({ name: "Mango", price: 5 }),
    ];
    expect(sortProducts(input, "price-desc").map((p) => p.name)).toEqual(["apple", "Zebra", "Mango"]);
  });

  it("R3: equal price and equal name keep input order in price-asc (stable)", () => {
    const first = product({ name: "Twin", price: 10 });
    const other = product({ name: "Other", price: 20 });
    const second = product({ name: "Twin", price: 10 });
    expect(sortProducts([second, other, first], "price-asc")).toEqual([second, first, other]);
    const result = sortProducts([second, other, first], "price-asc");
    expect(result[0]).toBe(second);
    expect(result[1]).toBe(first);
  });

  it("R3: equal price and equal name keep input order in price-desc (stable)", () => {
    const first = product({ name: "Twin", price: 10 });
    const other = product({ name: "Other", price: 5 });
    const second = product({ name: "Twin", price: 10 });
    const result = sortProducts([second, other, first], "price-desc");
    expect(result[0]).toBe(second);
    expect(result[1]).toBe(first);
    expect(result[2]).toBe(other);
  });

  // R4
  it.each([
    ["null", null],
    ["undefined", undefined],
  ])("R4: sortProducts(products, %s) returns a new array in input order", (_label, sort) => {
    const input = scrambled();
    const result = sortProducts(input, sort);
    expect(result).not.toBe(input);
    expect(indicesOf(input, result)).toEqual([0, 1, 2, 3, 4]);
  });

  it.each(["name", "", "PRICE-ASC", "price", "asc", "price-asc "])(
    'R4: an unknown runtime sort value (%j) returns input order and does not throw',
    (sort) => {
      const input = scrambled();
      let result: CatalogProduct[] = [];
      expect(() => {
        result = sortProducts(input, sort as unknown as ContractSort);
      }).not.toThrow();
      expect(result).not.toBe(input);
      expect(indicesOf(input, result)).toEqual([0, 1, 2, 3, 4]);
    },
  );

  it("R4: signed-out mock data with no sort stays in name order", async () => {
    const input = await signedOutProducts();
    expect(sortProducts(input, null).map((p) => p.slug)).toEqual(SIGNED_OUT_NAME_ORDER);
  });

  // R5
  it("R5: sortProducts never mutates its input array", () => {
    const input = scrambled();
    const before = [...input];
    const snapshot = structuredClone(input);
    for (const sort of [...PRICE_SORTS, null, undefined, "name"] as Array<ContractSort | null | undefined>) {
      sortProducts(input, sort);
      expect(input.length).toBe(before.length);
      input.forEach((p, i) => expect(p).toBe(before[i]));
    }
    expect(input).toEqual(snapshot);
  });

  it("R5: sortProducts works on a frozen input array", () => {
    const input = Object.freeze(scrambled());
    for (const option of PRICE_SORTS) {
      expect(() => sortProducts(input, option)).not.toThrow();
    }
  });

  it("R5: priceSortOrders never mutates its input array", () => {
    const input = scrambled();
    const before = [...input];
    const snapshot = structuredClone(input);
    priceSortOrders(input);
    expect(input.length).toBe(before.length);
    input.forEach((p, i) => expect(p).toBe(before[i]));
    expect(input).toEqual(snapshot);
    expect(() => priceSortOrders(Object.freeze(scrambled()))).not.toThrow();
  });

  it("R5: sortProducts never returns the input array itself", () => {
    const input = scrambled();
    for (const sort of [...PRICE_SORTS, null, undefined, "name"] as Array<ContractSort | null | undefined>) {
      expect(sortProducts(input, sort)).not.toBe(input);
    }
  });

  // R6
  it("R6: changing any field other than price and name never changes the order", () => {
    // Ties included; the other fields run against name order so a tie-break on them would show.
    const base = [
      product({ name: "Kite", price: 20, id: "a", slug: "a" }),
      product({ name: "Bell", price: 20, id: "b", slug: "b" }),
      product({ name: "Same", price: 7, id: "c", slug: "c" }),
      product({ name: "Same", price: 7, id: "d", slug: "d" }),
      product({ name: "Apple", price: 50, id: "e", slug: "e" }),
      product({ name: "Zulu", price: 1, id: "f", slug: "f" }),
    ];
    const variant = base.map((p, i) =>
      product({
        name: p.name,
        price: p.price,
        id: `z-${9 - i}`,
        slug: `z-${9 - i}`,
        savingsPercent: 90 - i * 10,
        priceTier: i % 2 === 0 ? "member" : "everyday",
        visibility: i % 2 === 0 ? "authenticated" : "public",
        category: i % 2 === 0 ? "musical" : "bath",
        description: `${9 - i}`,
        ageRange: `${9 - i}+`,
        material: `${9 - i}`,
        features: [`${9 - i}`],
        image: { url: `/products/${9 - i}.svg`, alt: `${9 - i}`, width: i, height: i },
      }),
    );
    for (const option of PRICE_SORTS) {
      expect(indicesOf(variant, sortProducts(variant, option))).toEqual(indicesOf(base, sortProducts(base, option)));
      expect(priceSortOrders(variant)[option]).toEqual(priceSortOrders(base)[option]);
    }
  });

  it("R6: sortProducts and priceSortOrders read no product field other than price and name", () => {
    const read = new Set<string>();
    const input = scrambled()
      .concat([product({ name: "Alpha", price: 5.5 })])
      .map(
        (p) =>
          new Proxy(p, {
            get(target, key, receiver) {
              if (typeof key === "string") read.add(key);
              return Reflect.get(target, key, receiver);
            },
          }),
      );
    for (const sort of [...PRICE_SORTS, null, undefined] as Array<ContractSort | null | undefined>) {
      sortProducts(input, sort);
    }
    priceSortOrders(input);
    expect([...read].filter((key) => key !== "price" && key !== "name")).toEqual([]);
  });

  // R7
  it.each([
    ["name order", () => scrambled().sort((a, b) => a.name.localeCompare(b.name, "en"))],
    ["already price-sorted", () => scrambled().sort((a, b) => a.price - b.price)],
    ["reversed price order", () => scrambled().sort((a, b) => b.price - a.price)],
    [
      "ties",
      () => [
        product({ name: "Zebra", price: 10 }),
        product({ name: "apple", price: 10 }),
        product({ name: "Twin", price: 10 }),
        product({ name: "Mango", price: 5 }),
        product({ name: "Twin", price: 10 }),
      ],
    ],
  ])("R7: priceSortOrders on %s gives, per option, a permutation that maps to sortProducts", (_label, make) => {
    const input = make();
    const orders = priceSortOrders(input);
    const all = input.map((_, i) => i);
    for (const option of PRICE_SORTS) {
      const order = orders[option];
      expect([...order].sort((a, b) => a - b)).toEqual(all);
      const mapped = order.map((i) => input[i]);
      const sorted = sortProducts(input, option);
      expect(mapped).toHaveLength(sorted.length);
      mapped.forEach((p, k) => expect(p).toBe(sorted[k]));
    }
  });

  it("R7: priceSortOrders on signed-in mock data maps to sortProducts for each option", async () => {
    const input = await signedInProducts();
    const orders = priceSortOrders(input);
    for (const option of PRICE_SORTS) {
      const mapped = orders[option].map((i) => input[i]);
      const sorted = sortProducts(input, option);
      expect(mapped).toHaveLength(input.length);
      mapped.forEach((p, k) => expect(p).toBe(sorted[k]));
    }
  });

  it("R7: priceSortOrders on the signed-out name-ordered list gives the contract indices", async () => {
    const input = await signedOutProducts();
    expect(input.map((p) => p.slug)).toEqual(SIGNED_OUT_NAME_ORDER);
    expect(priceSortOrders(input)).toEqual({
      "price-asc": [7, 6, 3, 0, 2, 4, 1, 5],
      "price-desc": [5, 1, 4, 2, 0, 3, 6, 7],
    });
  });

  // R8
  it('R8: priceSortOrders([]) returns { "price-asc": [], "price-desc": [] }', () => {
    expect(priceSortOrders([])).toEqual({ "price-asc": [], "price-desc": [] });
  });

  it("R8: priceSortOrders returns only the two option keys, each holding only integers", async () => {
    const result = priceSortOrders(await signedInProducts());
    expect(Object.keys(result).sort()).toEqual(["price-asc", "price-desc"]);
    for (const option of PRICE_SORTS) {
      expect(Array.isArray(result[option])).toBe(true);
      expect(result[option].every((i) => typeof i === "number" && Number.isInteger(i))).toBe(true);
    }
  });

  it("R8: priceSortOrders output carries no slug, name or price", async () => {
    const input = await signedInProducts();
    const json = JSON.stringify(priceSortOrders(input));
    for (const p of input) {
      expect(json).not.toContain(p.slug);
      expect(json).not.toContain(p.name);
      if (!Number.isInteger(p.price)) expect(json).not.toContain(String(p.price));
    }
  });

  // R9
  it("R9: signed-out mock data, price-asc, matches the contract order", async () => {
    expect(slugPrice(sortProducts(await signedOutProducts(), "price-asc"))).toEqual(SIGNED_OUT_ASC);
  });

  it("R9: signed-out mock data, price-desc, is the exact reverse of the contract asc order", async () => {
    expect(slugPrice(sortProducts(await signedOutProducts(), "price-desc"))).toEqual([...SIGNED_OUT_ASC].reverse());
  });

  it("R9: signed-in mock data, price-asc, matches the contract order (member prices, Set B mixed in)", async () => {
    expect(slugPrice(sortProducts(await signedInProducts(), "price-asc"))).toEqual(SIGNED_IN_ASC);
  });

  it("R9: signed-in mock data, price-desc, is the exact reverse of the contract asc order", async () => {
    expect(slugPrice(sortProducts(await signedInProducts(), "price-desc"))).toEqual([...SIGNED_IN_ASC].reverse());
  });
});
