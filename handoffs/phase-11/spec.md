# Phase 11: price sort helper

**Builder:** data-auth  ·  **Depends on:** P02 data layer (04e62d2), P09 savings percent (bb81078), docs commit D-038 (9d7708e)  ·  **Written by:** orchestrator

**Read:** architecture.md Data access (Price sort helper), Filtering and layout, Server/client boundary; design.md none. Builder and reviewer read only these (D-033).

## Goal

A pure, server-only module `src/lib/products/sort.ts` that sorts the catalog by the price the visitor sees (ascending or descending, equal prices by name A–Z) and computes, for a rendered list, the card index order for each sort option: the only data the phase 12 sort island will receive. Nothing calls it yet (phase 12, ui).

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `src/lib/products/sort.ts` exists, its first statement is `import "server-only";`, and it exports exactly `PriceSort`, `PRICE_SORTS`, `sortProducts` and `priceSortOrders` (contract) | architecture.md Data access (Price sort helper), D-038 | unit (exports), review |
| R2 | `sortProducts(products, "price-asc")` returns a new array ordered by `price` ascending; `"price-desc"` orders by `price` descending | architecture.md Data access, D-038 I3 | unit |
| R3 | Equal prices fall back to name A–Z (`a.name.localeCompare(b.name, "en")`, the mock adapter's name order) in **both** directions (descending does not reverse the tie order); equal price and equal name keep input order (stable) | architecture.md Data access ("equal prices fall back to name A–Z"), D-038 I3 | unit |
| R4 | `sortProducts(products, null)` and `sortProducts(products, undefined)` return a new array in input order; any other value at runtime (e.g. `"name"`, `""`, `"PRICE-ASC"`, passed with a cast) also returns input order and never throws | architecture.md Data access ("No `sort`: the input order is returned unchanged"), Filtering and layout (unknown values ignored) | unit |
| R5 | Neither function mutates its input array (same references and order after the call), and `sortProducts` never returns the input array itself (`result !== products`) | architecture.md Data access ("The input array is not mutated") | unit |
| R6 | The order depends only on each product's `price` and `name`: changing `savingsPercent`, `priceTier`, `visibility`, `slug`, `id` or any other field never changes the result. The module reads no field other than `price` and `name`, so a signed-out list (everyday prices) is ordered by nothing derived from member prices | architecture.md Data access ("The signed-out order uses nothing derived from member prices"), D-038 I3 | unit, review |
| R7 | `priceSortOrders(products)` returns `{ "price-asc": number[], "price-desc": number[] }` where each array is a permutation of `0 … products.length - 1` and `order.map((i) => products[i])` equals `sortProducts(products, option)` element for element, whatever the input order (name order, already price-sorted, reversed) | architecture.md Data access ("Computes, for a rendered list, the index order for each sort option"), Server/client boundary, D-038 I1 | unit |
| R8 | `priceSortOrders([])` returns `{ "price-asc": [], "price-desc": [] }`; the arrays contain only integers (no prices, slugs, names or objects) | architecture.md Server/client boundary ("Never prices, slugs or Set B data"), D-038 I1 | unit |
| R9 | Mock data, signed out (`getProducts()` without a session, 8 products): ascending and descending slug orders are exactly the lists in the contract; signed in (12 products, member prices, Set B mixed in): likewise | architecture.md Data access, Tests (D-038) | unit |
| R10 | No other file under `src/` changes: `CatalogProduct`, `filterProducts`, the DAL, both adapters and `fetchProducts` (cache key `sets` only) are untouched; nothing imports `sort.ts` yet | architecture.md Data access, D-022 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional.

```ts
// src/lib/products/sort.ts  (first statement: import "server-only";)
import type { CatalogProduct } from "@/lib/products/types";

export type PriceSort = "price-asc" | "price-desc";
export const PRICE_SORTS: readonly PriceSort[]; // exactly ["price-asc", "price-desc"], in this order

/** Pure. New array; price asc/desc, ties by name A–Z ("en"), then input order. null/undefined/unknown → input order. */
export function sortProducts(products: readonly CatalogProduct[], sort: PriceSort | null | undefined): CatalogProduct[];

/** Pure. For each option, indices into `products` giving that option's order. */
export function priceSortOrders(products: readonly CatalogProduct[]): Record<PriceSort, number[]>;
```

- `priceSortOrders(list)["price-asc"].map((i) => list[i])` deep-equals (and is reference-equal per element to) `sortProducts(list, "price-asc")`; the same for `"price-desc"`.
- Tie example qa asserts on (hand-built fixtures, any field values besides those shown): input `[{name: "Zebra", price: 10}, {name: "apple", price: 10}, {name: "Mango", price: 5}]` → asc names `Mango, apple, Zebra`; desc names `apple, Zebra, Mango` (`localeCompare` with `"en"` puts `apple` before `Zebra`). Two products with equal `price` and equal `name` keep their input order in both directions.
- Expected data qa asserts on (`src/data/products.mock.json` via `getProducts()`; every member price is `0.8 ×` the everyday price, and no two prices are equal):
  - Signed out, `price-asc` (8): `sunny-duck-bath-squirter` (9), `starlight-teether-ring` (11), `ocean-wave-rattle` (12), `bubble-bath-whale` (14), `jingle-ball-trio` (16), `rainbow-ring-stacker` (24), `cloud-bunny-plush` (28), `shape-sorter-cube` (32). `price-desc` is the exact reverse.
  - Signed in, `price-asc` (12): `sunny-duck-bath-squirter` (7.2), `starlight-teether-ring` (8.8), `ocean-wave-rattle` (9.6), `bubble-bath-whale` (11.2), `jingle-ball-trio` (12.8), `rainbow-ring-stacker` (19.2), `cloud-bunny-plush` (22.4), `shape-sorter-cube` (25.6), `sensory-crinkle-book-set` (28.8), `heirloom-wooden-xylophone` (43.2), `moonbeam-musical-mobile` (54.4), `forest-friends-activity-cube` (71.2). `price-desc` is the exact reverse.
  - Name order (no sort), signed out: `bubble-bath-whale`, `cloud-bunny-plush`, `jingle-ball-trio`, `ocean-wave-rattle`, `rainbow-ring-stacker`, `shape-sorter-cube`, `starlight-teether-ring`, `sunny-duck-bath-squirter`. For that input, `priceSortOrders(...)["price-asc"]` is `[7, 6, 3, 0, 2, 4, 1, 5]` and `["price-desc"]` is `[5, 1, 4, 2, 0, 3, 6, 7]`.

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- One new file, `src/lib/products/sort.ts`, next to `filter.ts`, rather than extending `filterProducts`: the page filters, then sorts (architecture.md Filtering and layout), and the index orders are computed on the sorted, filtered list the page renders.
- `sortProducts` accepts `null | undefined` and ignores unknown runtime values (R4), like `filterProducts` ignores unknown categories, so a bad cast can never throw on the catalog page. The page still validates `sort` with `parseCatalogParams` in phase 12.
- Ties use `localeCompare(…, "en")`, the comparator the mock adapter already uses for name order, so a price tie lands where the name-ordered grid would put it. Descending reverses the price comparison only, not the name tie-break (D-038 I3: "equal prices fall back to name A–Z").
- `PriceSort` is declared here (server-only module). Phase 12 parses the URL value in the isomorphic `src/components/catalog-params.ts` and may declare its own identical union there for client code; structural typing keeps the two compatible.

## Owned paths

| Role | May change |
|------|------------|
| data-auth | `src/lib/products/sort.ts` (new) |
| qa | `src/lib/products/sort.test.ts` (new) |

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

`verify-ssr.sh` and the e2e suite get no new assertions this phase; they must still pass unchanged (nothing calls the helper yet).

## Out of scope

- Reading `sort` from `searchParams`, `parseCatalogParams`, the page, the Price control, the sort island, skeletons (phase 12, ui).
- Any change to `src/components/**`, `src/app/**`, `scripts/**`, `e2e/**`, `CatalogProduct`, `filterProducts`, the DAL or the adapters.
- A "name" sort option or toggling a sort off (D-038 I2, I6).
- Any Contentful, `src/schemas/**` or mock data change.

## Amendments

none

## Where the instructions got in the way

- Orchestrator: none blocking. `docs/architecture.md` names no module path for the helper beyond `src/lib/products/`, so the file name and export names are contract decisions. No existing type changes, so the P09 hand-built-fixture problem does not apply.
