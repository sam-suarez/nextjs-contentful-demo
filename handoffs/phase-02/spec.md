# Phase 02: Data layer

**Builder:** data-auth  ·  **Depends on:** phase 01 (`bb5be94`: `src/lib/session.ts` exports `SESSION_COOKIE`, `Session`, `signSession`, `verifySessionToken`)  ·  **Written by:** orchestrator

## Goal

The server can load products from the mock file or Contentful (chosen by the `CONTENTFUL_*` credentials, logged once), through one cached `fetchProducts(sets)`. `src/lib/dal.ts` resolves the session itself and returns only what the visitor may see, with the price that applies already chosen, and a pure `filterProducts` filters by category and search text. No pages or components change.

## Requirements

Each one is decidable by a test, a command or a reading of the diff. Mock data facts used below: 12 products, 8 `public` and 4 `authenticated` (`forest-friends-activity-cube`, `heirloom-wooden-xylophone`, `moonbeam-musical-mobile`, `sensory-crinkle-book-set`); `bubble-bath-whale` has no image.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `selectProductSource(env)` returns `"contentful"` when `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT` and `CONTENTFUL_DELIVERY_TOKEN` are all non-empty after trimming; otherwise `"mock"`. Missing, `""` and whitespace-only all count as unset. Cases: all three set → `contentful`; any one of the three missing, `""` or `"  "` (other two set) → `mock`; `{}` → `mock`; the `.env.example` shape (`CONTENTFUL_ENVIRONMENT=master`, other two `""`) → `mock`. It does not log and does not read `process.env` | architecture.md Data access (Source selection); D-021 | unit |
| R2 | `getProductSource()` returns `selectProductSource(process.env)`, computed on the first call and reused for the life of the module. The first call writes exactly one `console.info` line, exactly `[products] source: mock` or `[products] source: contentful`; later calls write nothing. No `console.*` call anywhere in the diff prints an env value (space ID, environment, token, `SESSION_SECRET`) | architecture.md Data access ("One server log line"); D-021; reviewer G4 | unit + review |
| R3 | `fetchMockProducts(sets)` parses `src/data/products.mock.json` with `productCollectionSchema` and resolves to the parsed entries (`ProductEntry[]`) whose `fields.visibility` is in `sets`, sorted by `fields.name` (`localeCompare` with locale `"en"`). `["public"]` → the 8 public entries, none `authenticated`; `["public", "authenticated"]` → all 12; `[]` → `[]`. Image URLs are returned unchanged (`/products/<file>.svg`). It never calls `contentful` | architecture.md Data access; D-014, D-016, D-021 | unit |
| R4 | `fetchContentfulProducts(sets)` calls `createClient` (named import from `contentful`) with exactly `{ space, environment, accessToken }` taken from the trimmed `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT`, `CONTENTFUL_DELIVERY_TOKEN` (read at call time), then calls `client.withoutUnresolvableLinks.getEntries` exactly once with exactly `{ content_type: "product", "fields.visibility[in]": sets.join(","), order: ["fields.name"] }` (e.g. `"public,authenticated"`) | architecture.md Data access (Live adapter); D-016 | unit (with `contentful` mocked) |
| R5 | `fetchContentfulProducts` parses the `getEntries` result with `productCollectionSchema` and resolves to its `items`. If the result does not parse, the promise rejects (the error propagates); it never falls back to mock data or returns `[]` | architecture.md Data access; D-016 | unit |
| R6 | `fetchContentfulProducts(sets)` also drops any parsed entry whose `fields.visibility` is not in `sets`, so a logged-out call never resolves to an `authenticated` entry even if the API returns one (same filter as the mock adapter). Order of the remaining entries is kept as returned | architecture.md Data access ("Both adapters apply the same visibility filter"); D-014, D-021 | unit |
| R7 | `toCatalogProduct(entry, tier)` returns a `CatalogProduct` whose own keys are **exactly** `id, slug, name, category, visibility, description, ageRange, material, features, image, price, priceTier` (no `sys`, `fields`, `priceLoggedOut`, `priceAuthenticated`). `id` = `entry.sys.id`; the text fields are copied from `entry.fields`; `features` = `entry.fields.features ?? []` (a new array). `tier: "everyday"` → `price` = `priceLoggedOut`; `tier: "member"` → `price` = `priceAuthenticated`; `priceTier` = `tier`. Example: `cloud-bunny-plush` → `price` 28 everyday, 22.4 member | STATE.md P02 note (price resolved in the DAL); architecture.md Server/client boundary | unit |
| R8 | `toCatalogProduct` image: `null` when `entry.fields.image` is absent (`bubble-bath-whale`). Otherwise `{ url, alt, width, height }` with `alt` = asset `fields.description ?? fields.title`, `width`/`height` from `fields.file.details.image` or `null` when that is absent, and `url` = `"https:" + url` when the asset URL starts with `//` (e.g. `//images.ctfassets.net/a/b/c.svg` → `https://images.ctfassets.net/a/b/c.svg`), else unchanged (`/products/cloud-bunny-plush.svg` and `https://…` stay as they are) | architecture.md Data access (image URLs), Error handling | unit |
| R9 | `verifySession()` reads the cookie as `(await cookies()).get(SESSION_COOKIE)?.value` (`cookies` from `next/headers`) and returns `verifySessionToken(value)`: a valid token → `{ name, expiresAt }`; no cookie, a tampered token or an expired token → `null`. It imports `verifySessionToken` from `@/lib/session` and does not verify JWTs itself (no `jose` import in `dal.ts`). It is defined as `cache(async () => …)` with `cache` from `react` | architecture.md Data access (DAL), Auth; STATE.md P02 note | unit + review |
| R10 | `getProducts()` with no valid session (no cookie, tampered or expired token) resolves to exactly the 8 public products as `CatalogProduct`s, in name order, each with `priceTier: "everyday"` and `price` = that product's `priceLoggedOut`. No element has `visibility: "authenticated"`, and no element has a `priceAuthenticated` key | architecture.md Data access (DAL), Routes (`/`); D-014, D-017 | unit |
| R11 | `getProducts()` with a valid session resolves to all 12 products as `CatalogProduct`s in name order (Set B mixed in, not appended; e.g. index 2 is `forest-friends-activity-cube`), each with `priceTier: "member"` and `price` = that product's `priceAuthenticated` | architecture.md Data access (DAL), Routes (`/`); D-017 | unit |
| R12 | `getProductBySlug(slug)` returns: no session + public slug (`cloud-bunny-plush`) → `{ status: "found", product }` with `priceTier: "everyday"`, `price` 28; no session + Set B slug (`heirloom-wooden-xylophone`) → `{ status: "requires-login" }`; no session + unknown slug (`no-such-toy`) → `{ status: "not-found" }`; valid session + Set B slug → `found` with `priceTier: "member"`, `price` 43.2; valid session + public slug → `found` with `priceTier: "member"`, `price` 22.4 (for `cloud-bunny-plush`); valid session + unknown slug → `not-found`. A slug that fails `SLUG_PATTERN` (`""`, `"../etc"`, `"Cloud-Bunny-Plush"`) → `not-found` with or without a session. A valid session never yields `requires-login` | architecture.md Routes (`/products/[slug]`), Data access (DAL); D-018 | unit |
| R13 | The `requires-login` result deep-equals `{ status: "requires-login" }` (no other keys: no product, name, price or slug), and `not-found` deep-equals `{ status: "not-found" }` | D-014 (Set B never reaches HTML/RSC); architecture.md Server/client boundary | unit |
| R14 | `fetchProducts(sets)` is a module-level function in `src/lib/dal.ts` that is **not exported**. Its first body statement is `"use cache";`, followed by `cacheLife("hours")` and `cacheTag("products")` (both named imports from `next/cache`). Its only parameter is `sets`. It returns `getProductSource() === "contentful" ? fetchContentfulProducts(sets) : fetchMockProducts(sets)` (or equivalent), and contains no `cookies()`, `verifySession()` or other request data. The DAL calls it only with the literal arrays `["public"]` or `["public", "authenticated"]` | architecture.md Data access (`fetchProducts`); D-020; `.claude/rules/server-lib.md` | unit (`next/cache` mocked: `cacheTag` called with `"products"`, `cacheLife` with `"hours"`, on each DAL read) + review |
| R15 | `src/lib/dal.ts` exports exactly `verifySession`, `getProducts`, `getProductBySlug` and the type `ProductBySlugResult`. `verifySession` and `getProducts` take no parameters; `getProductBySlug` takes only `slug: string`. No exported function accepts a session, user or visibility set | architecture.md Data access (DAL); D-017; `.claude/rules/server-lib.md` | review |
| R16 | `filterProducts(products, filters)` returns a new array, keeps input order, and never mutates `products`. `category`: a value in `CATEGORIES` keeps only products of that category; `null`, `undefined`, `""` or an unknown value (`"robots"`) applies no category filter. `q`: trimmed; empty or whitespace-only applies no text filter; otherwise keeps products where the lower-cased `q` is a substring of the lower-cased `name`, `description` or any entry of `features`. Both given → both must match (AND). See the expected results table under Contract | architecture.md Filtering and layout; STATE.md P02 note (`q` fields) | unit |
| R17 | Every new file under `src/lib/**`, **including colocated `*.test.ts` files**, has `import "server-only";` as its first line. No file in `src/lib/**` has a file-level `"use server"` or `"use client"` directive | architecture.md Data access; `.claude/rules/server-lib.md`; reviewer G5 | review |
| R18 | The builder's changes are limited to the files listed under Owned paths. `package.json`, the lockfile, `.env.example`, `src/schemas/**` and `src/data/**` are unchanged. No `NEXT_PUBLIC_` variable is read | agents/data-auth.md Paths, Hard rules; reviewer G1, G4 | review |
| R19 | Unit tests never touch the network: every test that reaches `fetchContentfulProducts` mocks the `contentful` module, and the DAL tests run with the three `CONTENTFUL_*` vars set to `""` so the mock source is selected | architecture.md Tests | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional. All imports use the `@/` alias (`@/lib/...`, `@/schemas/product`, `@/data/products.mock.json`).

```ts
// src/lib/products/types.ts
import "server-only";
import type { Category, Visibility } from "@/schemas/product";

export type PriceTier = "everyday" | "member";

export type ProductImage = {
  url: string;           // absolute https URL (live) or /products/<file>.svg (mock)
  alt: string;           // asset description, else asset title
  width: number | null;
  height: number | null;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  visibility: Visibility;
  description: string;
  ageRange: string;
  material: string;
  features: string[];          // [] when the entry has none
  image: ProductImage | null;  // null → card renders the placeholder (P03)
  price: number;               // the one price this visitor may see
  priceTier: PriceTier;        // "everyday" logged out, "member" logged in
};
```

```ts
// src/lib/products/source.ts
import "server-only";

export type ProductSource = "contentful" | "mock";

/** Pure (R1). No logging, no process.env access. */
export function selectProductSource(env: Readonly<Record<string, string | undefined>>): ProductSource;

/** selectProductSource(process.env), memoized per module; logs one console.info line on first call (R2). */
export function getProductSource(): ProductSource;
```

```ts
// src/lib/products/mock-adapter.ts
import "server-only";
import type { ProductEntry, Visibility } from "@/schemas/product";

export function fetchMockProducts(sets: readonly Visibility[]): Promise<ProductEntry[]>;
```

```ts
// src/lib/products/contentful-adapter.ts
import "server-only";
import type { ProductEntry, Visibility } from "@/schemas/product";

export function fetchContentfulProducts(sets: readonly Visibility[]): Promise<ProductEntry[]>;
```

```ts
// src/lib/products/to-catalog-product.ts
import "server-only";
import type { ProductEntry } from "@/schemas/product";
import type { CatalogProduct, PriceTier } from "@/lib/products/types";

export function toCatalogProduct(entry: ProductEntry, tier: PriceTier): CatalogProduct;
```

```ts
// src/lib/products/filter.ts
import "server-only";
import type { CatalogProduct } from "@/lib/products/types";

/** Raw values as read from searchParams; validation happens here (R16). */
export type ProductFilters = { category?: string | null; q?: string | null };

export function filterProducts(products: readonly CatalogProduct[], filters: ProductFilters): CatalogProduct[];
```

```ts
// src/lib/dal.ts
import "server-only";
import type { Session } from "@/lib/session";
import type { CatalogProduct } from "@/lib/products/types";

export type ProductBySlugResult =
  | { status: "found"; product: CatalogProduct }
  | { status: "requires-login" }
  | { status: "not-found" };

export const verifySession: () => Promise<Session | null>;   // cache(async () => …) from "react"
export function getProducts(): Promise<CatalogProduct[]>;
export function getProductBySlug(slug: string): Promise<ProductBySlugResult>;

// not exported:
// async function fetchProducts(sets: readonly Visibility[]): Promise<ProductEntry[]> {
//   "use cache"; cacheLife("hours"); cacheTag("products"); …
// }
```

- DAL flow: `getProducts()` → `verifySession()`; `null` → `fetchProducts(["public"])` mapped with `toCatalogProduct(e, "everyday")`; a session → `fetchProducts(["public", "authenticated"])` mapped with `"member"`.
- `getProductBySlug(slug)`: if `!SLUG_PATTERN.test(slug)` → `{ status: "not-found" }` (no fetch). Otherwise look the slug up (exact, case-sensitive match on `fields.slug`) in the set the visitor may see, as above → `found` with the mapped product. If not found **and** there is no session, look it up in `fetchProducts(["public", "authenticated"])`: present → `{ status: "requires-login" }`, absent → `{ status: "not-found" }`. That lookup's result is reduced to the status and never returned, mapped or logged.
- Session: `cookies` from `next/headers` (awaited), cookie name `SESSION_COOKIE` (`"session"`). qa mocks `next/headers` (`cookies()` → `{ get(name) }`) and `next/cache` (`cacheLife`, `cacheTag` as `vi.fn()`), mints tokens with `signSession` from `@/lib/session`, and sets `process.env.SESSION_SECRET` (≥ 32 characters) itself. `"use cache"` is an inert string under Vitest, so `fetchProducts` runs on every call there.
- `verifySessionToken` throws when `SESSION_SECRET` is missing or short (P01 contract), so `verifySession`, `getProducts` and `getProductBySlug` throw in that case too. That is intended; no test should expect a silent logged-out fallback.
- Log line: `console.info("[products] source: mock")` or `console.info("[products] source: contentful")`, exact text, once per module instance. qa resets modules (`vi.resetModules()`) to test the first call.
- Live adapter, with `contentful` mocked as `{ createClient: vi.fn(() => ({ withoutUnresolvableLinks: { getEntries } })) }`: `createClient({ space, environment, accessToken })`; `getEntries({ content_type: "product", "fields.visibility[in]": sets.join(","), order: ["fields.name"] })`. A qa fixture for the live shape can be built from the mock entries with image URLs rewritten to `//images.ctfassets.net/...`.

### Expected filter results

Inputs are `CatalogProduct`s mapped from the mock entries. "All 12" = logged-in list; "public 8" = logged-out list. Results are slugs, in order.

| Input | `filters` | Result |
|---|---|---|
| all 12 | `{}` | all 12, same order (new array) |
| all 12 | `{ category: "bath" }` | `bubble-bath-whale`, `sunny-duck-bath-squirter` |
| all 12 | `{ category: "musical" }` | `heirloom-wooden-xylophone`, `jingle-ball-trio`, `moonbeam-musical-mobile` |
| public 8 | `{ category: "musical" }` | `jingle-ball-trio` |
| all 12 | `{ category: "robots" }` or `{ category: "" }` or `{ category: null }` | all 12 |
| all 12 | `{ q: "  WASHABLE " }` (features match) | `cloud-bunny-plush`, `sensory-crinkle-book-set` |
| public 8 | `{ q: "washable" }` | `cloud-bunny-plush` |
| all 12 | `{ q: "tub" }` (description-only match) | `bubble-bath-whale` |
| all 12 | `{ q: "Bath" }` (name match) | `bubble-bath-whale`, `sunny-duck-bath-squirter` |
| all 12 | `{ q: "freezer" }` | `starlight-teether-ring` |
| public 8 | `{ q: "lullab" }` | (empty) |
| all 12 | `{ q: "   " }` or `{ q: "" }` or `{ q: null }` | all 12 |
| all 12 | `{ category: "plush", q: "washable" }` | `cloud-bunny-plush` |
| all 12 | `{ category: "bath", q: "washable" }` | (empty) |
| all 12 | `{ q: "zzz" }` | (empty) |

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- **Module layout.** Adapters, source selection, mapping and filtering live under `src/lib/products/`; `fetchProducts` lives in `src/lib/dal.ts` because architecture.md says it is not exported, so it must sit in the module that calls it.
- **`CatalogProduct` view model** (in `src/lib`, since `src/schemas/**` is read-only) carries one `price` plus `priceTier`, never both prices. Pages render `price` and pick the label from `priceTier` (P03: "Everyday price" / "Member price"), so they never decide a price from the session and a logged-out render never holds a member price.
- **Mapping happens in the DAL, outside the cache.** `fetchProducts` caches parsed entries keyed only by `sets`; `toCatalogProduct` runs per request on the cached entries. The tier follows from the set list the DAL chose from the session.
- **`requires-login` needs one Set B lookup for a logged-out request.** architecture.md requires telling "requires login" from "not found" for a Set B slug without a session, which the server can only do by checking the authenticated set. D-014's intent is that Set B never reaches HTML or the RSC payload; the lookup is reduced to a status with no product data (R13), and it reuses the logged-in cache entry. See "Where the instructions got in the way".
- **`cacheLife("hours")`.** Products change rarely; `cacheTag("products")` allows on-demand revalidation later. architecture.md says only `cacheLife(...)`.
- **Live adapter re-applies the visibility filter after the query** (R6): belt and braces for D-014, and it makes "both adapters apply the same visibility filter" testable without the network.
- **Whitespace-only `CONTENTFUL_*` values count as unset** and values are trimmed before use (architecture.md says an empty string counts as unset; whitespace is treated the same).
- **`filterProducts` takes raw search-param values** and ignores unknown categories itself, so the "unknown values are ignored" rule is unit-tested in `src/lib`. P03 still picks the first value when a param is an array and validates `layout` in the page.
- **Image normalization (`https:` prefix) is in `toCatalogProduct`,** so it applies to whichever source supplied the entry; the adapters return entries as parsed.
- **`alt` = asset description, else title.** Mock and live assets both carry a title and a description.
- **Mock sort** uses `localeCompare(…, "en")` so the order does not depend on the JSON file's order; live order comes from Contentful's `order: ["fields.name"]`. Both give the same order for the current 12 names.
- **Malformed slugs short-circuit to `not-found`** (`SLUG_PATTERN` from `src/schemas/product.ts`), so arbitrary URL segments never reach a lookup.

## Owned paths

| Role | May change |
|------|------------|
| data-auth | `src/lib/dal.ts`, `src/lib/products/types.ts`, `src/lib/products/source.ts`, `src/lib/products/mock-adapter.ts`, `src/lib/products/contentful-adapter.ts`, `src/lib/products/to-catalog-product.ts`, `src/lib/products/filter.ts` |
| qa | `src/lib/dal.test.ts`, `src/lib/products/source.test.ts`, `src/lib/products/mock-adapter.test.ts`, `src/lib/products/contentful-adapter.test.ts`, `src/lib/products/to-catalog-product.test.ts`, `src/lib/products/filter.test.ts` (all under `src/lib/**`, so each starts with `import "server-only";`, R17) |

`package.json` changes allowed: none (`contentful`, `zod`, `react` are already dependencies).

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
```

Unit tests set `SESSION_SECRET` and the three `CONTENTFUL_*` vars themselves and restore them after; they never rely on `.env.local` and never touch the network. `npm run build` must succeed without `SESSION_SECRET` (no route calls the DAL yet, so nothing runs at build time). Because no route imports `dal.ts` until P03, the Next `"use cache"` transform is not exercised by this phase's build; P03's build is the first real compile of it.

## Out of scope

- Any page, component, header or `searchParams` parsing in a route (`src/app/**`, `src/components/**`; P03/P04). `layout` validation is P03.
- `scripts/verify-ssr.sh`, Playwright (P03/P04).
- Contentful pagination (`skip`/`limit`), locales, preview API, webhooks, `revalidateTag`/`updateTag` callers.
- Changes to `src/lib/session.ts`, `src/lib/auth/**` or `src/proxy.ts` (P01, closed).
- Price formatting (`$11.20`): P03 renders `price`; the DAL returns a number.
- `"use cache: private"` or `"use cache: remote"`; caching the session.

## Where the instructions got in the way

- D-014 says "logged-out requests only ever query `public`", but architecture.md Routes requires a logged-out request for a Set B slug to 307 to `/login` while an unknown slug 404s. Telling the two apart needs a lookup in the authenticated set. Resolved in Contract decisions by reducing that lookup to a bare status (R13); D-014's wording should say "never return" rather than "never query".
- architecture.md gives `cacheLife(...)` without a profile; picked `"hours"`.
- architecture.md says the page "validates" search params but P02's `filterProducts` is the natural tested place for the category rule; split recorded in Contract decisions.
- The continuation prompt was pasted with its `Human check:` placeholder unfilled; the orchestrator asked and the human answered PASSED. `/phase` was not used, so the orchestrator path-guard hook (D-029) is off again this thread; Paths kept by hand.
