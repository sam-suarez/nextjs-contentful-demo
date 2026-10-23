# Phase 09: savings percent

**Builder:** data-auth  ·  **Depends on:** P02 data layer (04e62d2), docs commit D-036 (df43efc)  ·  **Written by:** orchestrator

**Read:** architecture.md Data access, Server/client boundary; design.md none. Builder and reviewer read only these (D-033).

## Goal

Every `CatalogProduct` the DAL returns carries `savingsPercent: number | null`, computed on the server by one pure helper: a whole-number percent for member-tier products whose member price is lower, `null` otherwise. Nothing renders it yet (phase 10).

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `src/lib/products/savings.ts` exists, starts with `import "server-only";`, and exports `savingsPercent(everydayPrice, memberPrice)` returning `Math.round((1 - memberPrice / everydayPrice) * 100)` when that value is greater than 0 | architecture.md Data access (`savingsPercent`), D-036 | unit |
| R2 | `savingsPercent` returns `null` when `everydayPrice` is 0 (or less), and when the rounded value is 0 or less (equal prices, member price higher, a saving under 0.5%). It never returns `NaN`, `Infinity`, `-0` or a fraction | architecture.md Data access, D-036 | unit |
| R3 | `CatalogProduct` in `src/lib/products/types.ts` gains exactly one field, `savingsPercent: number \| null`. No other field is added: in particular no everyday price for a member-tier product | architecture.md Data access ("never receive the everyday price for a member-tier product"), D-036 | unit (key set), review |
| R4 | `toCatalogProduct(entry, "member")` sets `savingsPercent` to `savingsPercent(entry.fields.priceLoggedOut, entry.fields.priceAuthenticated)`; `toCatalogProduct(entry, "everyday")` sets it to `null` without calling anything that reads `priceAuthenticated` into the result | architecture.md Data access, D-036 | unit |
| R5 | `getProducts()` with a valid session returns all 12 mock products, each with `savingsPercent: 20`; without a session it returns the 8 public products, each with `savingsPercent: null` | architecture.md Data access, D-036 | unit |
| R6 | `getProductBySlug(slug)` with status `found` carries the same `savingsPercent` as `getProducts()` for that slug (logged in: `cloud-bunny-plush` → 20, `forest-friends-activity-cube` → 20; logged out: `cloud-bunny-plush` → `null`) | architecture.md Data access, D-036 | unit |
| R7 | The live and mock adapters both get the field through `toCatalogProduct` (no second computation of the percent anywhere in `src/`) | architecture.md Data access ("Both adapters apply the same…"), D-036 | review |
| R8 | No file outside the owned paths changes; no component, page or test outside this phase's list changes; `fetchProducts` keeps its cache key (`sets` only) | architecture.md Data access, D-022 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional.

```ts
// src/lib/products/savings.ts  (first line: import "server-only";)
export function savingsPercent(everydayPrice: number, memberPrice: number): number | null

// src/lib/products/types.ts
export type CatalogProduct = {
  // …every existing field unchanged (id, slug, name, category, visibility, description,
  //   ageRange, material, features, image, price, priceTier)…
  savingsPercent: number | null; // D-036: whole percent for member tier with a saving, else null
};

// src/lib/products/to-catalog-product.ts  (signature unchanged)
export function toCatalogProduct(entry: ProductEntry, tier: PriceTier): CatalogProduct
```

- Formula: `Math.round((1 - memberPrice / everydayPrice) * 100)`. Result `<= 0` → `null`. `everydayPrice <= 0` → `null` (checked before dividing).
- Helper cases qa asserts on (exact):
  - `savingsPercent(14, 11.2)` → `20` (the float is 19.999…; a floor would give 19)
  - `savingsPercent(28, 22.4)` → `20`
  - `savingsPercent(89, 71.2)` → `20`
  - `savingsPercent(3, 1)` → `67` (66.67 rounds up: nearest, not floor)
  - `savingsPercent(3, 2)` → `33`
  - `savingsPercent(200, 130)` → `35`
  - `savingsPercent(10, 10)` → `null`
  - `savingsPercent(10, 12)` → `null`
  - `savingsPercent(100, 99.7)` → `null` (0.3 rounds to 0)
  - `savingsPercent(0, 0)` → `null`; `savingsPercent(0, 5)` → `null`
- `CatalogProduct` key set after this phase (sorted): `ageRange, category, description, features, id, image, material, name, price, priceTier, savingsPercent, slug, visibility`.
- Expected data qa asserts on (`src/data/products.mock.json`): 12 products, every one with `priceAuthenticated = 0.8 × priceLoggedOut`, so every member-tier product has `savingsPercent: 20`. Public (8): `bubble-bath-whale`, `cloud-bunny-plush`, `jingle-ball-trio`, `ocean-wave-rattle`, `rainbow-ring-stacker`, `shape-sorter-cube`, `starlight-teether-ring`, `sunny-duck-bath-squirter`. Set B (4): `forest-friends-activity-cube`, `heirloom-wooden-xylophone`, `moonbeam-musical-mobile`, `sensory-crinkle-book-set`.

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- The helper lives in its own file `src/lib/products/savings.ts` and takes the two prices, not the tier: the tier decision stays in `toCatalogProduct`, which is already the one place that picks `price` and `priceTier`, so both adapters inherit it (R7).
- The helper is in `src/lib/` (server-only) rather than `src/components/format.ts`, because architecture.md says pages and components never compute it.
- `everydayPrice <= 0` (not only `=== 0`) returns `null`, so the helper never divides by zero or a negative even if the schema check were bypassed.

## Owned paths

| Role | May change |
|------|------------|
| data-auth | `src/lib/products/savings.ts` (new), `src/lib/products/types.ts`, `src/lib/products/to-catalog-product.ts` |
| qa | `src/lib/products/savings.test.ts` (new), `src/lib/products/to-catalog-product.test.ts` (incl. its `CATALOG_KEYS` key-set assertion, which must gain `savingsPercent`), `src/lib/dal.test.ts`, `src/lib/products/filter.test.ts` (fixture only: add `savingsPercent`, no assertion changes; amendment A1) |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
```

`verify-ssr.sh` and the e2e suite get no new assertions this phase; they must still pass unchanged (nothing renders the field yet).

## Out of scope

- Rendering `You save <n>%`, the savings pill, the reserved row, skeleton changes (phase 10, ui).
- Any change to `src/components/**`, `src/app/**`, `scripts/**`, `e2e/**`.
- Exposing the everyday price on member-tier products, or any savings value to a logged-out render (I9).
- Any Contentful, `src/schemas/**` or mock data change.

## Amendments

- **A1 (2026-10-22, orchestrator, pre-build round 1):** qa found that `src/lib/products/filter.test.ts` builds a `CatalogProduct` by hand (its `catalog(e, tier)` fixture), so a required `savingsPercent` breaks typecheck and build there. The spec omitted it from the qa row. Added it to the qa owned paths: fixture only (`savingsPercent: tier === "member" ? 20 : null`), no assertion changes. R8's "no test outside this phase's list" now includes it.
- **A2 (2026-10-22, orchestrator):** R2's "never `NaN` or `Infinity`" applies to finite inputs. `productEntrySchema` already guarantees finite, non-negative prices, so non-finite inputs are not tested and have no required result.

## Where the instructions got in the way

- Orchestrator: step 1 forbids reading `src/` to design a spec, and grep is allowed only to confirm a previous contract. A test fixture that hand-builds the type being extended was therefore missed until qa pre-build (amendment A1). Grepping `: CatalogProduct` in `*.test.ts` before narrowing qa's paths would have caught it.
