# Phase 11: QA

## Pre-build

**Tests written:** all in `src/lib/products/sort.test.ts` (one `describe("sort")`, 38 tests after `it.each` expansion). They call the contract through typed wrappers (`sortProducts`, `priceSortOrders`, `PRICE_SORTS` typed by the spec signatures), so the missing module is the only pre-build type error. R9, plus some R4/R7/R8 checks, use real mock data via `getProducts()`, with `next/headers`, `next/cache`, React `cache` and `contentful` stubbed the way `dal.test.ts` does it. `CONTENTFUL_*` are stubbed to `""` and the session is a `signSession` cookie.

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `R1: exports exactly PRICE_SORTS, sortProducts and priceSortOrders at runtime` | `src/lib/products/sort.test.ts` |
| R1 | `R1: PriceSort is exactly "price-asc" \| "price-desc"` (`expectTypeOf`, enforced by typecheck) | same |
| R1 | `R1: PRICE_SORTS is exactly ["price-asc", "price-desc"], in that order` | same |
| R2 | `R2: sortProducts(products, "price-asc") orders by price ascending` | same |
| R2 | `R2: sortProducts(products, "price-desc") orders by price descending` | same |
| R2 | `R2: the result holds the input's own product objects, each exactly once` | same |
| R3 | `R3: equal prices fall back to name A-Z ("en") in price-asc` (contract tie example) | same |
| R3 | `R3: equal prices still fall back to name A-Z ("en") in price-desc (tie order not reversed)` | same |
| R3 | `R3: equal price and equal name keep input order in price-asc (stable)` | same |
| R3 | `R3: equal price and equal name keep input order in price-desc (stable)` | same |
| R4 | `R4: sortProducts(products, null/undefined) returns a new array in input order` (2 cases) | same |
| R4 | `R4: an unknown runtime sort value (%j) returns input order and does not throw` (6 cases: `"name"`, `""`, `"PRICE-ASC"`, `"price"`, `"asc"`, `"price-asc "`) | same |
| R4 | `R4: signed-out mock data with no sort stays in name order` | same |
| R5 | `R5: sortProducts never mutates its input array` | same |
| R5 | `R5: sortProducts works on a frozen input array` | same |
| R5 | `R5: priceSortOrders never mutates its input array` | same |
| R5 | `R5: sortProducts never returns the input array itself` | same |
| R6 | `R6: changing any field other than price and name never changes the order` (ties included; the other fields run against name order) | same |
| R6 | `R6: sortProducts and priceSortOrders read no product field other than price and name` (Proxy records property reads) | same |
| R7 | `R7: priceSortOrders on %s gives, per option, a permutation that maps to sortProducts` (4 cases: name order, already price-sorted, reversed, ties) | same |
| R7 | `R7: priceSortOrders on signed-in mock data maps to sortProducts for each option` | same |
| R7 | `R7: priceSortOrders on the signed-out name-ordered list gives the contract indices` (`[7,6,3,0,2,4,1,5]` / `[5,1,4,2,0,3,6,7]`) | same |
| R8 | `R8: priceSortOrders([]) returns { "price-asc": [], "price-desc": [] }` | same |
| R8 | `R8: priceSortOrders returns only the two option keys, each holding only integers` | same |
| R8 | `R8: priceSortOrders output carries no slug, name or price` | same |
| R9 | `R9: signed-out mock data, price-asc, matches the contract order` (slug and price pairs) | same |
| R9 | `R9: signed-out mock data, price-desc, is the exact reverse of the contract asc order` | same |
| R9 | `R9: signed-in mock data, price-asc, matches the contract order (member prices, Set B mixed in)` | same |
| R9 | `R9: signed-in mock data, price-desc, is the exact reverse of the contract asc order` | same |

Requirements verified only by `review`: R10. Also review-only: the "first statement is `import "server-only";`" part of R1 (the spec gives R1 as "unit (exports), review"), and the review half of R6.

`verify-ssr.sh` and e2e: the spec adds no assertions this phase, so neither changed.

**Run summary:**

- `npx vitest run src/lib/products/sort.test.ts`: 1 suite failed to load, 0 tests ran.
- `npm test`: Test Files 1 failed | 17 passed (18); Tests 458 passed (458). The only failure is the new suite.
- `npm run typecheck`: 1 error, TS2307 missing module.
- `npm run lint`: clean. `scripts/check-client-boundary.sh`: `OK: client boundary respected`.
- `npm run build`, `verify-ssr.sh` and e2e were not run pre-build. They have no new assertions, and the build fails on the missing-module test import anyway (next-16-notes).

```
 FAIL  src/lib/products/sort.test.ts [ src/lib/products/sort.test.ts ]
Error: Cannot find package '@/lib/products/sort' imported from .../src/lib/products/sort.test.ts
 ❯ src/lib/products/sort.test.ts:29:1
     29| import * as sortModule from "@/lib/products/sort";
 Test Files  1 failed | 17 passed (18)
      Tests  458 passed (458)

src/lib/products/sort.test.ts(29,29): error TS2307: Cannot find module '@/lib/products/sort' or its corresponding type declarations.
```

**Why each failure is the expected one:** `src/lib/products/sort.ts` doesn't exist yet, so the suite fails at import and typecheck reports TS2307 for that module only. To show the tests aren't broken, I ran them against throwaway implementations through an alias-only Vitest config in the scratchpad. I didn't touch `src/`. Results:

- A spec-conforming implementation passes all 38 tests.
- A version whose desc reverses the asc result (tie order reversed) fails 3 tests (R3 desc tie, R3 desc stable, R7 ties).
- A version that breaks ties on `slug` fails 6 tests (R3 ×4, R6 ×2).
- A version that returns or sorts the input array in place fails 15 tests (R4, R5, R7).

## Post-build

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (18 files, 496 tests, incl. 38 in sort.test.ts) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS (514 passed, 0 failed) | |
| `npm run test:e2e` | PASS (43 passed) | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (unit exports; first-statement `import "server-only";` seen at top of file, review to confirm) |
| R2 | PASS |
| R3 | PASS |
| R4 | PASS |
| R5 | PASS |
| R6 | PASS (unit; review half pending) |
| R7 | PASS |
| R8 | PASS |
| R9 | PASS |
| R10 | review |

**Overall:** PASS

## Dispute

none

## Open issues

none

## Where the instructions got in the way

- The typecheck hook says that any error besides missing-module errors is a test bug. My first draft got TS7006 (implicit `any`) errors that came only from the missing module typing its results as `any`. I typed the calls through wrappers with explicit spec signatures (the `dal.test.ts` pattern) so only TS2307 remains. That cascade is worth knowing about for future pre-build tests.
- The spec's Checks list `verify-ssr.sh` but not `npm run test:e2e`. It also says e2e "must still pass unchanged", and `agents/qa.md` Checks includes e2e, so I will run both post-build.
