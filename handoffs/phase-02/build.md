# Phase 02: Build (data-auth, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/products/types.ts` | created: `PriceTier`, `ProductImage`, `CatalogProduct` (types only, exactly as the Contract) | R7, R8, R17 |
| `src/lib/products/source.ts` | created: pure `selectProductSource(env)` (all three `CONTENTFUL_*` non-empty after `trim()` → `"contentful"`, else `"mock"`; no logging, no `process.env`); `getProductSource()` memoizes `selectProductSource(process.env)` in a module-level variable and on the first call writes one `console.info("[products] source: <source>")` with only the source name in it | R1, R2, R17 |
| `src/lib/products/mock-adapter.ts` | created: `fetchMockProducts(sets)` imports `@/data/products.mock.json` as a module, parses it with `productCollectionSchema` on each call, keeps entries whose `fields.visibility` is in `sets` and sorts by `fields.name.localeCompare(…, "en")`. Image URLs untouched. No `contentful` import | R3, R17 |
| `src/lib/products/contentful-adapter.ts` | created: `fetchContentfulProducts(sets)` calls `createClient({ space, environment, accessToken })` with the trimmed env values read at call time, then `client.withoutUnresolvableLinks.getEntries({ content_type: "product", "fields.visibility[in]": sets.join(","), order: ["fields.name"] })` once, parses with `productCollectionSchema.parse` (throws → promise rejects, no fallback), then filters again by `sets` keeping API order | R4, R5, R6, R17 |
| `src/lib/products/to-catalog-product.ts` | created: `toCatalogProduct(entry, tier)` builds an object literal with exactly the 12 `CatalogProduct` keys; `features` is a new array (`[]` when absent); `price` is picked by `tier`; image is `null` or `{ url, alt, width, height }`, with a `//` URL prefixed by `https:` (private helpers `normalizeUrl`, `toImage`, not exported) | R7, R8, R17 |
| `src/lib/products/filter.ts` | created: `ProductFilters` type and `filterProducts(products, filters)`. It uses `Array.prototype.filter`, so the result is a new array in input order and the input is never mutated. `category` applies only when it is in `CATEGORIES`. `q` is trimmed and lower-cased and matched as a substring of the lower-cased `name`, `description` or any `features` entry. The two filters combine with AND | R16, R17 |
| `src/lib/dal.ts` | created. `verifySession = cache(async () => verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value))`, with `cache` from `react` and no `jose` import. `fetchProducts(sets)` is not exported. Its body is `"use cache"; cacheLife("hours"); cacheTag("products");` then the source branch. `getProducts()` and `getProductBySlug(slug)` follow the Contract flow and call `fetchProducts` only with the literal arrays `["public"]` and `["public", "authenticated"]`. A slug that fails `SLUG_PATTERN` returns `not-found` before any session read or fetch. For a logged-out visitor whose slug is not public, the Set B lookup is reduced to a `.some(...)` boolean, so `requires-login` and `not-found` are fresh `{ status }` objects. Exports: `verifySession`, `getProducts`, `getProductBySlug`, type `ProductBySlugResult` | R9 to R15, R17 |

No other files changed. `package.json`, the lockfile, `.env.example`, `src/schemas/**`, `src/data/**`, `src/lib/session.ts`, `src/lib/auth/**` and `src/proxy.ts` are untouched (`git status --porcelain` on those paths is empty). The test files match `handoffs/phase-02/tests.sha` (all 11 OK). No `NEXT_PUBLIC_` variable is read. The only `console.*` call is the R2 line.

## Fixes this round

none

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`, `tsc --noEmit` exit 0 |
| `npm run lint` | PASS | `eslint`, no output, exit 0 |
| `npm test` | PASS | `Test Files  11 passed (11)` / `Tests  251 passed (251)` (109 P01 + 142 P02) |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | Run as `env -u SESSION_SECRET npm run build`. `✓ Compiled successfully`, routes `○ /`, `○ /_not-found`, `ƒ Proxy (Middleware)`, exit 0 |
| Pre-build state (procedure step 2) | as qa.md said | Before the build: 6 files failed with `Cannot find package '@/lib/...'` and the 109 P01 tests passed, matching qa.md Pre-build |
| R17 first line / directives | PASS | All 12 files in `src/lib/products/` plus `src/lib/dal.ts` start with `import "server-only";`. No file-level `"use server"` / `"use client"` in `src/lib/**` |

## Open issues

- The `"use cache"` transform on `fetchProducts` has not been compiled by Next yet. No route imports `dal.ts`, so `npm run build` does not bundle it, and under Vitest the directive is an inert string. The spec already says this (Checks). P03's build is the first real compile, so a Next-side problem (for example, serialization of the `readonly Visibility[]` argument or the `ProductEntry[]` return value) would first show up there. Both are plain arrays of strings and JSON objects, which `use-cache.md` lists as serializable, so I expect no problem.
- `npm run build` ran with `SESSION_SECRET` removed from the shell environment, but Next also loads `.env.local`, which exists in this checkout. I did not open it. The build does not depend on it: no route reaches the DAL or the session code at build time.
- No disputed tests.

## Where the instructions got in the way

- `agents/data-auth.md` Owns lists `src/lib/**`, but the spec's Owned paths limit this phase to seven files (R18). I followed the narrower spec list. The two do not conflict, but the role file could say "the spec's Owned paths narrow this".
- The Contract shows the log line as `console.info("[products] source: mock")` / `"... contentful"`. I used one template literal, `` `[products] source: ${activeSource}` ``, which prints the same text and interpolates only the `ProductSource` value, never an env value. A reviewer reading R2 literally may want to confirm the two are equivalent.
