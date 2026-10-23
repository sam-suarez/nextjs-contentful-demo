# Phase 09: QA

## Pre-build

**Tests written:**

New tests carry a `P09` prefix so they don't get mixed up with the P02 requirement IDs (R7 to R14) already used in the same files.

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `P09 R1: savings.ts starts with import "server-only";` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(14, 11.2) → 20 (rounds 19.999…, not floor)` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(28, 22.4) → 20` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(89, 71.2) → 20` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(3, 1) → 67 (nearest, not floor)` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(3, 2) → 33` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(200, 130) → 35` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: savingsPercent(10, 0) → 100 (formula with a free member price)` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: every mock price pair (member = 0.8 × everyday) → 20` | `src/lib/products/savings.test.ts` |
| R1 | `P09 R1: a positive result equals Math.round((1 - member / everyday) * 100) across a price grid` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(10, 10) → null (equal prices)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(10, 12) → null (member price higher)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(100, 99.7) → null (0.3% rounds to 0)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(100, 100.3) → null, not -0 (-0.3% rounds to -0)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(0, 0) → null (no NaN)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: savingsPercent(0, 5) → null (no -Infinity)` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: an everyday price of -0 → null (savingsPercent(-0, 0), savingsPercent(-0, 5))` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: a negative everyday price → null (savingsPercent(-10, 5), savingsPercent(-10, -20))` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: a non-positive rounded value → null across a price grid` | `src/lib/products/savings.test.ts` |
| R2 | `P09 R2: the result is always null or a positive whole number (never NaN, Infinity, -0 or a fraction)` | `src/lib/products/savings.test.ts` |
| R3 | `P09 R3: the key set is exactly the 12 earlier keys plus savingsPercent, for both tiers` | `src/lib/products/to-catalog-product.test.ts` |
| R3 | `R7: own keys are exactly the CatalogProduct keys` (+ the no-image variant): `CATALOG_KEYS` now includes `savingsPercent` | `src/lib/products/to-catalog-product.test.ts` |
| R3 | `R7: maps cloud-bunny-plush everyday to the full expected CatalogProduct`: expected object now has `savingsPercent: null` | `src/lib/products/to-catalog-product.test.ts` |
| R3 | `P09 R3: getProducts products have exactly the CatalogProduct keys incl. savingsPercent, with and without a session` | `src/lib/dal.test.ts` |
| R4 | `P09 R4: tier "member" gives savingsPercent 20 for every mock entry` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "everyday" gives savingsPercent null for every mock entry` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" computes from priceLoggedOut and priceAuthenticated (3 → 1 gives 67)` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" computes from priceLoggedOut and priceAuthenticated (200 → 130 gives 35)` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" with equal prices gives savingsPercent null` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" with a higher member price gives savingsPercent null` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" with a saving under 0.5% gives savingsPercent null (100 → 99.7)` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "member" with an everyday price of 0 gives savingsPercent null` | `src/lib/products/to-catalog-product.test.ts` |
| R4 | `P09 R4: tier "everyday" stays null whatever priceAuthenticated is (1, 0, 130, 1000)` | `src/lib/products/to-catalog-product.test.ts` |
| R5 | `P09 R5: with a valid session, getProducts returns 12 products, each with savingsPercent 20` | `src/lib/dal.test.ts` |
| R5 | `P09 R5: $label → getProducts returns the 8 public products, each with savingsPercent null` (no cookie, tampered token, expired token) | `src/lib/dal.test.ts` |
| R5 | `R10` / `R11` / `R12` full-object `toStrictEqual` tests: the shared `expected()` fixture now has `savingsPercent` (member 20, everyday null) | `src/lib/dal.test.ts` |
| R6 | `P09 R6: logged in, getProductBySlug(cloud-bunny-plush) has savingsPercent 20` | `src/lib/dal.test.ts` |
| R6 | `P09 R6: logged in, getProductBySlug(forest-friends-activity-cube) has savingsPercent 20` | `src/lib/dal.test.ts` |
| R6 | `P09 R6: logged out, getProductBySlug(cloud-bunny-plush) has savingsPercent null` | `src/lib/dal.test.ts` |
| R6 | `P09 R6: logged in, every slug's savingsPercent matches getProducts for that slug` | `src/lib/dal.test.ts` |
| R6 | `P09 R6: logged out, every public slug's savingsPercent matches getProducts for that slug` | `src/lib/dal.test.ts` |
| (A1, fixture only) | `catalog(e, tier)` fixture gains `savingsPercent: tier === "member" ? 20 : null`; return type `CatalogProduct & { savingsPercent: number \| null }`; no assertion changed | `src/lib/products/filter.test.ts` |

Requirements verified only by `review`: R7, R8 (R3 also by review for "no everyday price for a member-tier product"; the unit side is the exact key set plus the existing P02 test `R7: has no sys, fields, priceLoggedOut or priceAuthenticated key`).

How the tests are typed: `dal.test.ts` and `to-catalog-product.test.ts` read the field through a local `CatalogProduct & { savingsPercent: number | null }`. Before the build that is the only way to reach the field without a type error. After the build it is the same type as `CatalogProduct`, so no runtime assertion is weakened. `filter.test.ts` (amendment A1) uses the same intersection as its fixture's return type, because a `savingsPercent` key in a literal typed `CatalogProduct` would be an excess-property error (TS2353) until the build. `verify-ssr.sh` and `e2e/**` are unchanged, as the spec says.

**Run summary:** (round 2, after amendment A1)

- `filter.test.ts` alone: 31 passed (31). The fixture change is inert before the build, and the file now matches the post-build `CatalogProduct` shape.
- `npx vitest run` on the three phase files: 3 files failed. 32 tests failed and 49 passed (the 49 are the existing P02 tests the field doesn't affect). On top of that, `savings.test.ts` fails at load, so its 20 tests never run.
- `npm test` (whole suite): 32 failed, 402 passed (434). All failures are in the three phase files.
- `tsc --noEmit`: 1 error, the expected missing module (TS2307 for `@/lib/products/savings`). `eslint` on the four phase test files: clean.
- `npm run build` / `verify-ssr.sh` / e2e: not run before the build. No new assertions this phase, and `next build` stops at the same TS2307.
- Sanity check of my own tests: I ran `savings.test.ts` with `@/lib/products/savings` aliased to a reference implementation of the spec formula in the scratchpad (not in `src/`). 19 passed. 1 failed (`starts with import "server-only"`), because `src/lib/products/savings.ts` doesn't exist yet.

```
src/lib/products/savings.test.ts(6,32): error TS2307: Cannot find module '@/lib/products/savings' or its corresponding type declarations.
 FAIL  src/lib/products/savings.test.ts [ src/lib/products/savings.test.ts ]
Error: Cannot find package '@/lib/products/savings' imported from .../src/lib/products/savings.test.ts
 FAIL  src/lib/products/to-catalog-product.test.ts > ... > R7: own keys are exactly the CatalogProduct keys
AssertionError: expected [ 'ageRange', 'category', …(10) ] to strictly equal [ 'ageRange', 'category', …(11) ]
 FAIL  src/lib/products/to-catalog-product.test.ts > ... > P09 R4: tier "member" computes from priceLoggedOut and priceAuthenticated (3 → 1 gives 67)
AssertionError: expected undefined to be 67 // Object.is equality
 FAIL  src/lib/dal.test.ts > dal > R11: with a valid session → all 12 CatalogProducts in name order
AssertionError: expected [ { …(12) }, { …(12) }, …(10) ] to strictly equal [ { …(13) }, { …(13) }, …(10) ]
 FAIL  src/lib/dal.test.ts > dal > P09 R5: with a valid session, getProducts returns 12 products, each with savingsPercent 20
AssertionError: bubble-bath-whale: expected undefined to be 20 // Object.is equality
 FAIL  src/lib/dal.test.ts > dal > P09 R6: logged out, getProductBySlug(cloud-bunny-plush) has savingsPercent null
AssertionError: expected undefined to be null
      Tests  32 failed | 402 passed (434)
```

**Why each failure is the expected one:**

- `savings.test.ts`: module `@/lib/products/savings` not found (TS2307 / Vitest load error). The file is created by this phase. With a reference implementation every value assertion passes, so the tests themselves are sound.
- `to-catalog-product.test.ts` P09 tests and the updated `CATALOG_KEYS` / full-object R7 tests: `toCatalogProduct` doesn't set `savingsPercent` yet. The key set has 12 keys, not 13, and the field reads `undefined`, not `20` / `67` / `35` / `null`.
- `dal.test.ts` P09 tests and the R10 / R11 / R12 full-object tests: the DAL products have no `savingsPercent` yet (12 keys, not 13; `undefined`, not `20` / `null`). The two "matches getProducts" R6 tests first assert the getProducts value (20 / null), so they can't pass on `undefined === undefined`.

## Post-build

Output only for a FAIL, at most 15 lines per check.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (17 files, 454 tests) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS (495 passed, 0 failed) | |
| `npm run test:e2e` | not run (not in the spec's Checks for P09; no new assertions) | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS |
| R2 | PASS |
| R3 | PASS (unit; review part is the reviewer's) |
| R4 | PASS |
| R5 | PASS |
| R6 | PASS |
| R7 | review |
| R8 | review |

**Overall:** PASS

## Dispute

none

## Open issues

- Resolved by amendment A1 (round 1 blocker): `src/lib/products/filter.test.ts` hand-builds a `CatalogProduct`. Its fixture now carries `savingsPercent`, so the required field no longer breaks post-build typecheck or build. No other `CatalogProduct` literal exists in `src/`, `e2e/` or `scripts/` (searched for `priceTier:`).
- R2 "never returns NaN / Infinity": tested for finite inputs only, matching amendment A2. Everyday price is in {0, -0, -5, -10, a grid of positive prices} and the member price is finite. Non-finite inputs are not tested.

## Where the instructions got in the way

- The spec's owned paths for qa missed a test file that the contract change (R3) forces to change (see Open issues). A search for `CatalogProduct` literals in `*.test.ts` while writing the spec would have caught it.
