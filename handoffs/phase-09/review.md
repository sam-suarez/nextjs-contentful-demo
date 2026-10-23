# Phase 09: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/products/savings.ts:1 is `import "server-only";`. savings.ts:8-12 exports `savingsPercent(everydayPrice, memberPrice): number \| null` and returns `Math.round((1 - memberPrice / everydayPrice) * 100)` when it is > 0. Tests are at savings.test.ts:172-230 (diff 172-230). | |
| R2 | PASS | savings.ts:9 returns `null` for `everydayPrice <= 0` before dividing, which also catches `-0`. savings.ts:11 `percent > 0 ? percent : null` maps 0 and `-0` (because `-0 > 0` is false) and negatives to `null`. With finite inputs (A2), `Math.round` only produces whole numbers. Tests are at savings.test.ts diff 232-287. | |
| R3 | PASS | src/lib/products/types.ts:28 is the only added line: `savingsPercent: number \| null`. No everyday price field was added. Key-set assertions are at to-catalog-product.test.ts diff 330 and 349-359, and dal.test.ts diff 45-48 and 84-88. | |
| R4 | PASS | to-catalog-product.ts:40: `tier === "member" ? savingsPercent(f.priceLoggedOut, f.priceAuthenticated) : null`. The everyday branch is a literal `null` and never reads `priceAuthenticated`. Tests are at to-catalog-product.test.ts diff 361-426. | |
| R5 | PASS | src/lib/dal.ts:42 and :45 map every entry through `toCatalogProduct` with "member" or "everyday", so the field reaches the DAL output. Tests at dal.test.ts diff 67-82 check 12 slugs with 20 each, and 8 public slugs with `null` for each no-session case. | |
| R6 | PASS | dal.ts:55 and :59 use the same `toCatalogProduct` mapping as `getProducts`. Tests at dal.test.ts diff 90-121 cover cloud-bunny-plush and forest-friends-activity-cube (20), logged-out cloud-bunny-plush (`null`), and per-slug equality with `getProducts`. | |
| R7 | PASS | `fetchProducts` (dal.ts:34) picks the adapter, then maps every result through `toCatalogProduct` (dal.ts:42, 45, 55, 59). A Grep of non-test `src` finds `savingsPercent(` called only at to-catalog-product.ts:40, so there is no second computation. | |
| R8 | PASS | The diff touches only savings.ts, types.ts and to-catalog-product.ts (data-auth), plus savings.test.ts, to-catalog-product.test.ts, dal.test.ts and filter.test.ts (qa, A1). filter.test.ts diff 132-145 changes only the fixture. dal.ts is unchanged, and `fetchProducts(sets)` keeps its `sets`-only key with `"use cache"`, `cacheLife` and `cacheTag("products")` (dal.ts:30-35). | |
| G1 | PASS | Every file in the diff is in the spec's owned-paths table, data-auth or qa (including A1). | |
| G2 | PASS | The diff adds no `'use client'`. | |
| G3 | PASS | No `instant = false` and no `loading.tsx`. No rendering code is touched. | |
| G4 | PASS | No `NEXT_PUBLIC_` reads, no secrets, no logging added. | |
| G5 | PASS | The only new `src/lib` module, savings.ts, starts with `import "server-only";` at line 1. The new test savings.test.ts also starts with it (diff 155). | |
| G6 | PASS | No client island is touched. A Grep finds no constructor or consumer of `savingsPercent` outside `src/lib`. | |

Overall: PASS

Notes:
- The three test files use the intersection type `CatalogProduct & { savingsPercent: number | null }` and cast `as CatalogProductWithSavings` (dal.test.ts diff 11-17, to-catalog-product.test.ts diff 317-322, filter.test.ts diff 137) so typecheck passes before the build. Now that the build is in, these types match `CatalogProduct` and could be simplified later. This is style only.
- The price-grid tests (savings.test.ts diff 223-230 and 268-275) recompute the formula the same way the helper does, so they mostly confirm the `> 0` / `null` split. The exact-value cases from the spec are covered separately.
- filter.test.ts diff 145 hard-codes `20` for member fixtures, as A1 asks. It holds only while the mock data keeps the 0.8 ratio.

Where the instructions got in the way: none

**Orchestrator decision:** close (qa PASS, all reviewer requirements PASS, 1 build round)
