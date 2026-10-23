# Phase 11: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/products/sort.ts:1 is `import "server-only";`. The only exports are `PriceSort` (:5), `PRICE_SORTS` (:7, frozen `["price-asc", "price-desc"]`), `sortProducts` (:28) and `priceSortOrders` (:34), and their signatures match the contract. sort.test.ts:154-165 checks the runtime keys, the type equality and the order. | |
| R2 | PASS | sort.ts:11 compares `a.price - b.price` for asc and `b.price - a.price` for desc. :30 maps the index order into a new array. Tested at sort.test.ts:168-176. | |
| R3 | PASS | sort.ts:13 falls back to `a.name.localeCompare(b.name, "en")` without depending on direction, so desc does not reverse ties. sort.ts:20 adds the `\|\| i - j` index tie-break, so equal price and name keep input order. Tested at sort.test.ts:186-222, including the contract's Zebra/apple/Mango example. | |
| R4 | PASS | sort.ts:29 returns `[...products]` when `isPriceSort` is false. `isPriceSort` (:23-25) is a strict equality check against the two literals, so null, undefined and unknown strings cannot throw. Tested at sort.test.ts:225-251. | |
| R5 | PASS | `orderFor` sorts a fresh index array from `products.map` (sort.ts:18-20), never the input. Both branches of `sortProducts` return new arrays (:29-30). Tested at sort.test.ts:254-289, including frozen input. | |
| R6 | PASS | `compare` reads only `.price` and `.name` (sort.ts:11, :13), and the index tie-break uses positions, not fields. sort.test.ts:292-343 checks this with field variation and a Proxy that records every property read. | |
| R7 | PASS | `sortProducts` is `orderFor(...).map(i => products[i])` (sort.ts:30), and `priceSortOrders` returns the same `orderFor` result (:35-38). So the mapping holds by construction, element by element. Tested at sort.test.ts:346-392, including the contract indices `[7, 6, 3, 0, 2, 4, 1, 5]` / `[5, 1, 4, 2, 0, 3, 6, 7]`. | |
| R8 | PASS | sort.ts:34-38 returns only the two keys, each holding an array of indices (`orderFor` maps to `index`). Mapping an empty input gives `[]`. Tested at sort.test.ts:395-416. | |
| R9 | PASS | sort.test.ts:419-433 runs the real `getProducts()` signed out and signed in, and asserts the contract slug/price lists and their exact reverses. The implementation sorts on the DAL-resolved `price` only (sort.ts:11). | |
| R10 | PASS | The diff adds only src/lib/products/sort.ts and sort.test.ts. A Grep of `src` for `products/sort` finds only the test import (sort.test.ts:29). | |
| G1 | PASS | Both files in the diff are owned: sort.ts by data-auth, sort.test.ts by qa. No package.json change. | |
| G2 | PASS | No `'use client'` in the diff. | |
| G3 | PASS | No `instant = false`, no `loading.tsx` and no request-data rendering in the diff. | |
| G4 | PASS | No env reads in sort.ts. The test only stubs server env vars (sort.test.ts:145-148), and there is no `NEXT_PUBLIC_`. | |
| G5 | PASS | sort.ts:1 and sort.test.ts:1 both start with `import "server-only";`. | |
| G6 | PASS | No client island is touched or created. `priceSortOrders` output holds integers only, with no prices, slugs or names (sort.ts:34-38). | |

Overall: PASS

Notes:
- The spec asks for stability on equal price and equal name. sort.ts:20 enforces it explicitly with the index tie-break instead of relying on engine sort stability, which is robust.
- If a product had a `NaN` price, the comparator would be inconsistent. The schema and DAL presumably rule this out, and no requirement covers it.
- The mock-data tests in sort.test.ts stub next/headers, next/cache, react `cache` and contentful (sort.test.ts:12-32), the same way dal.test.ts does according to its comment. The R9 tests depend on those stubs.

Where the instructions got in the way: none

**Orchestrator decision:** close (pending qa post-build PASS)
