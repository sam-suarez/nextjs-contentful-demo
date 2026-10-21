import "server-only";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import mockData from "@/data/products.mock.json";
import { productCollectionSchema, type ProductEntry, type Visibility } from "@/schemas/product";

// Phase 04-fix1 R1-R3: src/lib/products/members-only.ts (contract: isMembersOnlySlug,
// MEMBERS_ONLY_SLUGS_TTL_MS). The source and both adapters are mocked so each test controls
// which adapter answers, when and with what; the mock adapter calls through to the real
// mock data by default. No network.

type Fetch = (sets: readonly Visibility[]) => Promise<ProductEntry[]>;

const deps = vi.hoisted(() => ({
  getProductSource: vi.fn<() => "mock" | "contentful">(),
  fetchMockProducts: vi.fn<(sets: readonly ("public" | "authenticated")[]) => Promise<unknown[]>>(),
  fetchContentfulProducts: vi.fn<(sets: readonly ("public" | "authenticated")[]) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/products/source", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getProductSource: deps.getProductSource,
}));
vi.mock("@/lib/products/mock-adapter", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchMockProducts: deps.fetchMockProducts,
}));
vi.mock("@/lib/products/contentful-adapter", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchContentfulProducts: deps.fetchContentfulProducts,
}));

const LOG_PREFIX = "[products] members-only slugs loaded: ";
const FIVE_MINUTES = 5 * 60 * 1000;

const entries = productCollectionSchema.parse(mockData).items;
const AUTH_ENTRIES = entries.filter((e) => e.fields.visibility === "authenticated");
const PUBLIC_ENTRIES = entries.filter((e) => e.fields.visibility === "public");
const AUTH_SLUGS = AUTH_ENTRIES.map((e) => e.fields.slug);
const PUBLIC_SLUGS = PUBLIC_ENTRIES.map((e) => e.fields.slug);
const SET_B = "forest-friends-activity-cube";
const PUBLIC = "cloud-bunny-plush";
const UNKNOWN = "no-such-toy";

// Strings that fail SLUG_PATTERN (/^[a-z0-9]+(?:-[a-z0-9]+)*$/), several built from a real Set B slug.
const PATTERN_FAILING = [
  "Forest-Friends-Activity-Cube",
  ` ${SET_B}`,
  `${SET_B}/`,
  `${SET_B}-`,
  "forest--friends-activity-cube",
  "../forest-friends-activity-cube",
  "forest_friends_activity_cube",
  "%2Fforest-friends-activity-cube",
];

const CONSOLE_METHODS = ["log", "info", "warn", "error", "debug", "trace"] as const;
type Spies = Record<(typeof CONSOLE_METHODS)[number], ReturnType<typeof vi.spyOn>>;

function spyConsole(): Spies {
  return Object.fromEntries(
    CONSOLE_METHODS.map((m) => [m, vi.spyOn(console, m).mockImplementation(() => {})]),
  ) as Spies;
}

/** Each console call as the single line it prints (args joined by a space, like util.format). */
function lines(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((args) =>
    args.map((a) => (typeof a === "string" ? a : (JSON.stringify(a) ?? String(a)))).join(" "),
  );
}

function loadedLines(spies: Spies): string[] {
  return CONSOLE_METHODS.flatMap((m) => lines(spies[m])).filter((l) => l.includes("members-only slugs loaded"));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A copy of a real Set B entry under another slug (for the contentful-source cases). */
function withSlug(entry: ProductEntry, slug: string): ProductEntry {
  return { ...entry, sys: { ...entry.sys, id: `id-${slug}` }, fields: { ...entry.fields, slug } };
}

/** Fresh module instance: the in-memory cache starts empty (spec Contract: vi.resetModules + re-import). */
async function fresh() {
  vi.resetModules();
  return import("@/lib/products/members-only");
}

let realFetchMock: Fetch;
let spies: Spies;

describe("products/members-only", () => {
  beforeEach(async () => {
    vi.stubEnv("CONTENTFUL_SPACE_ID", "");
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", "");
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", "");
    spies = spyConsole();
    const actual = await vi.importActual<{ fetchMockProducts: Fetch }>("@/lib/products/mock-adapter");
    realFetchMock = actual.fetchMockProducts;
    deps.getProductSource.mockReset().mockReturnValue("mock");
    deps.fetchMockProducts.mockReset().mockImplementation((sets) => realFetchMock(sets));
    deps.fetchContentfulProducts
      .mockReset()
      .mockRejectedValue(new Error("contentful adapter must not be called for the mock source"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // --- R1: exports and results ------------------------------------------------

  it("R1: MEMBERS_ONLY_SLUGS_TTL_MS is 5 * 60 * 1000", async () => {
    const { MEMBERS_ONLY_SLUGS_TTL_MS } = await fresh();
    expect(MEMBERS_ONLY_SLUGS_TTL_MS).toBe(FIVE_MINUTES);
  });

  it("R1: isMembersOnlySlug returns a Promise", async () => {
    const { isMembersOnlySlug } = await fresh();
    const result = isMembersOnlySlug(SET_B);
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it.each(AUTH_SLUGS)("R1: authenticated slug %s resolves true", async (slug) => {
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(slug)).resolves.toBe(true);
  });

  it.each(PUBLIC_SLUGS)("R1: public slug %s resolves false", async (slug) => {
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(slug)).resolves.toBe(false);
  });

  it("R1: unknown slug no-such-toy resolves false", async () => {
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(UNKNOWN)).resolves.toBe(false);
  });

  it("R1: every slug resolves correctly from one module instance (warm cache)", async () => {
    const { isMembersOnlySlug } = await fresh();
    for (const slug of AUTH_SLUGS) await expect(isMembersOnlySlug(slug)).resolves.toBe(true);
    for (const slug of [...PUBLIC_SLUGS, UNKNOWN]) await expect(isMembersOnlySlug(slug)).resolves.toBe(false);
  });

  it("R1: the mock source fetches with exactly ['authenticated']", async () => {
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(deps.fetchMockProducts.mock.calls).toStrictEqual([[["authenticated"]]]);
  });

  it("R1: the mock source never calls the contentful adapter", async () => {
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(deps.fetchContentfulProducts).not.toHaveBeenCalled();
  });

  it("R1: the contentful source fetches with exactly ['authenticated'] and never calls the mock adapter", async () => {
    deps.getProductSource.mockReturnValue("contentful");
    deps.fetchContentfulProducts.mockReset().mockResolvedValue(AUTH_ENTRIES);
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(deps.fetchContentfulProducts.mock.calls).toStrictEqual([[["authenticated"]]]);
    expect(deps.fetchMockProducts).not.toHaveBeenCalled();
  });

  it("R1: the contentful source answers from the contentful adapter's slugs, not the mock data", async () => {
    deps.getProductSource.mockReturnValue("contentful");
    deps.fetchContentfulProducts
      .mockReset()
      .mockResolvedValue([withSlug(AUTH_ENTRIES[0], "live-only-toy"), AUTH_ENTRIES[1]]);
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug("live-only-toy")).resolves.toBe(true);
    await expect(isMembersOnlySlug(AUTH_ENTRIES[1].fields.slug)).resolves.toBe(true);
    await expect(isMembersOnlySlug(AUTH_ENTRIES[2].fields.slug)).resolves.toBe(false);
    await expect(isMembersOnlySlug(PUBLIC)).resolves.toBe(false);
  });

  it("R1: the empty string resolves false without fetching", async () => {
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug("")).resolves.toBe(false);
    expect(deps.fetchMockProducts).not.toHaveBeenCalled();
    expect(deps.fetchContentfulProducts).not.toHaveBeenCalled();
  });

  it.each(PATTERN_FAILING)("R1: pattern-failing %j resolves false without fetching", async (slug) => {
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(slug)).resolves.toBe(false);
    expect(deps.fetchMockProducts).not.toHaveBeenCalled();
    expect(deps.fetchContentfulProducts).not.toHaveBeenCalled();
  });

  it("R1: a pattern-failing slug resolves false even when the adapter would fail", async () => {
    deps.fetchMockProducts.mockReset().mockRejectedValue(new Error("adapter down"));
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug("Not-Valid-Slug")).resolves.toBe(false);
  });

  // --- R2: in-memory cache and log line ---------------------------------------

  it("R2: many sequential calls within the TTL trigger exactly one adapter fetch", async () => {
    const { isMembersOnlySlug } = await fresh();
    for (const slug of [SET_B, PUBLIC, UNKNOWN, ...AUTH_SLUGS, SET_B, SET_B]) await isMembersOnlySlug(slug);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(1);
  });

  it("R2: concurrent calls on a cold cache trigger exactly one adapter fetch", async () => {
    const gate = deferred<ProductEntry[]>();
    deps.fetchMockProducts.mockReset().mockImplementation(() => gate.promise);
    const { isMembersOnlySlug } = await fresh();
    const pending = [SET_B, PUBLIC, UNKNOWN, ...AUTH_SLUGS].map((slug) => isMembersOnlySlug(slug));
    gate.resolve(AUTH_ENTRIES);
    await Promise.all(pending);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(1);
  });

  it("R2: concurrent calls on a cold cache all resolve to the right answer", async () => {
    const gate = deferred<ProductEntry[]>();
    deps.fetchMockProducts.mockReset().mockImplementation(() => gate.promise);
    const { isMembersOnlySlug } = await fresh();
    const pending = Promise.all([SET_B, PUBLIC, UNKNOWN, ...AUTH_SLUGS].map((slug) => isMembersOnlySlug(slug)));
    gate.resolve(AUTH_ENTRIES);
    await expect(pending).resolves.toStrictEqual([true, false, false, true, true, true, true]);
  });

  it("R2: a call just before the TTL expires is still served from the cache", async () => {
    vi.useFakeTimers();
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    vi.advanceTimersByTime(FIVE_MINUTES - 1000);
    await expect(isMembersOnlySlug(SET_B)).resolves.toBe(true);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(1);
  });

  it("R2: the first call after the TTL expires fetches again", async () => {
    vi.useFakeTimers();
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    vi.advanceTimersByTime(FIVE_MINUTES + 1000);
    await expect(isMembersOnlySlug(SET_B)).resolves.toBe(true);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(2);
  });

  it("R2: after a refetch the new list is cached again for the next TTL window", async () => {
    vi.useFakeTimers();
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    vi.advanceTimersByTime(FIVE_MINUTES + 1000);
    await isMembersOnlySlug(SET_B);
    vi.advanceTimersByTime(60_000);
    await isMembersOnlySlug(PUBLIC);
    await isMembersOnlySlug(SET_B);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(2);
  });

  it("R2: a refetch after expiry uses the new list (a product moved out of Set B)", async () => {
    vi.useFakeTimers();
    deps.fetchMockProducts.mockReset().mockResolvedValueOnce(AUTH_ENTRIES).mockResolvedValueOnce(AUTH_ENTRIES.slice(1));
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(AUTH_SLUGS[0])).resolves.toBe(true);
    vi.advanceTimersByTime(FIVE_MINUTES + 1000);
    await expect(isMembersOnlySlug(AUTH_SLUGS[0])).resolves.toBe(false);
  });

  it("R2: the first fetch logs exactly one console.info line '[products] members-only slugs loaded: 4'", async () => {
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(lines(spies.info).filter((l) => l.startsWith(LOG_PREFIX))).toStrictEqual([`${LOG_PREFIX}4`]);
  });

  it("R2: the loaded line is written only through console.info", async () => {
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(loadedLines(spies)).toStrictEqual([`${LOG_PREFIX}4`]);
  });

  it("R2: cached calls write no further loaded line", async () => {
    const { isMembersOnlySlug } = await fresh();
    for (const slug of [SET_B, PUBLIC, UNKNOWN, SET_B]) await isMembersOnlySlug(slug);
    expect(loadedLines(spies)).toHaveLength(1);
  });

  it("R2: concurrent calls on a cold cache write exactly one loaded line", async () => {
    const { isMembersOnlySlug } = await fresh();
    await Promise.all([SET_B, PUBLIC, UNKNOWN, ...AUTH_SLUGS].map((slug) => isMembersOnlySlug(slug)));
    expect(loadedLines(spies)).toStrictEqual([`${LOG_PREFIX}4`]);
  });

  it("R2: each refetch after expiry logs one more loaded line with the new count", async () => {
    vi.useFakeTimers();
    deps.fetchMockProducts.mockReset().mockResolvedValueOnce(AUTH_ENTRIES).mockResolvedValueOnce(AUTH_ENTRIES.slice(1));
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    vi.advanceTimersByTime(FIVE_MINUTES + 1000);
    await isMembersOnlySlug(SET_B);
    expect(loadedLines(spies)).toStrictEqual([`${LOG_PREFIX}4`, `${LOG_PREFIX}3`]);
  });

  it("R2: the count comes from the active source (contentful returning 2 entries logs 2)", async () => {
    deps.getProductSource.mockReturnValue("contentful");
    deps.fetchContentfulProducts.mockReset().mockResolvedValue(AUTH_ENTRIES.slice(0, 2));
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B);
    expect(loadedLines(spies)).toStrictEqual([`${LOG_PREFIX}2`]);
  });

  it("R2: a pattern-failing slug on a cold cache logs no loaded line", async () => {
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug("Not-Valid-Slug");
    await isMembersOnlySlug("");
    expect(loadedLines(spies)).toStrictEqual([]);
  });

  it("R2: no console output contains a slug, a product name or a CONTENTFUL_* value", async () => {
    const SPACE = "space-id-secret-abc123";
    const ENVIRONMENT = "env-secret-xyz789";
    const TOKEN = "delivery-token-secret-0123456789";
    vi.stubEnv("CONTENTFUL_SPACE_ID", SPACE);
    vi.stubEnv("CONTENTFUL_ENVIRONMENT", ENVIRONMENT);
    vi.stubEnv("CONTENTFUL_DELIVERY_TOKEN", TOKEN);
    deps.getProductSource.mockReturnValue("contentful");
    deps.fetchContentfulProducts.mockReset().mockResolvedValue(AUTH_ENTRIES);
    const { isMembersOnlySlug } = await fresh();
    for (const slug of [SET_B, PUBLIC, UNKNOWN]) await isMembersOnlySlug(slug);
    const printed = CONSOLE_METHODS.flatMap((m) => lines(spies[m])).join("\n");
    for (const forbidden of [
      ...AUTH_SLUGS,
      ...AUTH_ENTRIES.map((e) => e.fields.name),
      PUBLIC,
      UNKNOWN,
      SPACE,
      ENVIRONMENT,
      TOKEN,
    ]) {
      expect(printed).not.toContain(forbidden);
    }
  });

  // --- R3: adapter failure ----------------------------------------------------

  it("R3: if the adapter fetch rejects, isMembersOnlySlug rejects", async () => {
    deps.fetchMockProducts.mockReset().mockRejectedValue(new Error("adapter down"));
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(SET_B)).rejects.toThrow();
  });

  it("R3: a rejected fetch is not cached as false: the next call fetches again and resolves true", async () => {
    deps.fetchMockProducts
      .mockReset()
      .mockRejectedValueOnce(new Error("adapter down"))
      .mockImplementation((sets) => realFetchMock(sets));
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(SET_B)).rejects.toThrow();
    await expect(isMembersOnlySlug(SET_B)).resolves.toBe(true);
    expect(deps.fetchMockProducts).toHaveBeenCalledTimes(2);
  });

  it("R3: a rejected fetch for a public slug rejects too (no silent false)", async () => {
    deps.fetchMockProducts.mockReset().mockRejectedValue(new Error("adapter down"));
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(PUBLIC)).rejects.toThrow();
  });

  it("R3: concurrent callers waiting on a rejected fetch all reject", async () => {
    const gate = deferred<ProductEntry[]>();
    deps.fetchMockProducts.mockReset().mockImplementationOnce(() => gate.promise);
    const { isMembersOnlySlug } = await fresh();
    const pending = [SET_B, PUBLIC].map((slug) => isMembersOnlySlug(slug));
    gate.reject(new Error("adapter down"));
    const settled = await Promise.allSettled(pending);
    expect(settled.map((s) => s.status)).toStrictEqual(["rejected", "rejected"]);
  });

  it("R3: a rejected fetch logs no loaded line", async () => {
    deps.fetchMockProducts.mockReset().mockRejectedValue(new Error("adapter down"));
    const { isMembersOnlySlug } = await fresh();
    await isMembersOnlySlug(SET_B).catch(() => {});
    expect(loadedLines(spies)).toStrictEqual([]);
  });

  it("R3: the contentful adapter rejecting makes isMembersOnlySlug reject, and the next call retries", async () => {
    deps.getProductSource.mockReturnValue("contentful");
    deps.fetchContentfulProducts
      .mockReset()
      .mockRejectedValueOnce(new Error("contentful down"))
      .mockResolvedValue(AUTH_ENTRIES);
    const { isMembersOnlySlug } = await fresh();
    await expect(isMembersOnlySlug(SET_B)).rejects.toThrow();
    await expect(isMembersOnlySlug(SET_B)).resolves.toBe(true);
    expect(deps.fetchContentfulProducts).toHaveBeenCalledTimes(2);
  });
});
