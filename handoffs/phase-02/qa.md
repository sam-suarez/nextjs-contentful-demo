# Phase 02: QA

## Pre-build

**Tests written:** 142 tests in 6 files, each starting with `import "server-only";` (R17), one `describe` per file. Five of the files were already in the tree, untracked, from an earlier pre-build pass. I re-checked them against the spec, kept them and added one test (R3, reversed file order). `src/lib/dal.test.ts` is new.

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `R1: all three CONTENTFUL_* vars set selects contentful`; `R1: set values with surrounding whitespace still select contentful`; `R1: $name $kind (other two set) selects mock` (9 cases: each var missing / `""` / `"  "`); `R1: an empty env {} selects mock`; `R1: the .env.example shape (environment=master, other two empty) selects mock`; `R1: selectProductSource does not log`; `R1: selectProductSource ignores process.env when it is fully set` / `... when it is blank` | `src/lib/products/source.test.ts` |
| R2 | `R2: getProductSource returns mock when process.env CONTENTFUL_* vars are empty` / `... contentful when process.env has all three vars`; `R2: first call logs exactly one console.info line '[products] source: mock'` / `... 'contentful'`; `R2: no console method other than info is called on the first call`; `R2: later calls write nothing to the console`; `R2: the first result is reused even if process.env changes later`; `R2: no console output contains a CONTENTFUL_* value or SESSION_SECRET` (the "anywhere in the diff" part is review) | `src/lib/products/source.test.ts` |
| R3 | `R3: ["public"] resolves to the 8 public entries`; `R3: ["public"] never includes an authenticated entry`; `R3: ["public", "authenticated"] resolves to all 12 entries`; `R3: [] resolves to []`; `R3: ["public"] entries are the parsed entries sorted by name (localeCompare "en")`; `R3: ["public", "authenticated"] entries are the parsed entries sorted by name`; `R3: Set B entries are mixed into name order, not appended`; `R3: every returned entry parses as a ProductEntry`; `R3: image URLs are returned unchanged as /products/<file>.svg`; `R3: bubble-bath-whale is returned without an image`; `R3: sorts by name itself, not by the JSON file's order (file reversed)`; `R3: never calls contentful` | `src/lib/products/mock-adapter.test.ts` |
| R4 | `R4: calls createClient with exactly { space, environment, accessToken }`; `R4: trims the CONTENTFUL_* values before passing them to createClient`; `R4: reads the CONTENTFUL_* values at call time, not at import`; `R4: calls getEntries exactly once with the exact query for ["public"]`; `R4: calls getEntries exactly once with "public,authenticated" for both sets` | `src/lib/products/contentful-adapter.test.ts` |
| R5 | `R5: resolves to the parsed items of the getEntries result`; `R5: returns live image URLs as parsed (no https: prefix added by the adapter)`; `R5: rejects when the result has no items array`; `R5: rejects when an item does not parse (invalid slug)`; `R5: rejects when an item is missing a required field (priceLoggedOut)` | `src/lib/products/contentful-adapter.test.ts` |
| R6 | `R6: drops authenticated entries the API returns for a public-only query`; `R6: keeps every entry whose visibility is in sets`; `R6: [] drops every entry`; `R6: keeps the remaining entries in the order the API returned them` | `src/lib/products/contentful-adapter.test.ts` |
| R7 | `R7: own keys are exactly the CatalogProduct keys` (with and without image); `R7: has no sys, fields, priceLoggedOut or priceAuthenticated key`; `R7: maps cloud-bunny-plush everyday to the full expected CatalogProduct`; `R7: id is entry.sys.id`; `R7: text fields are copied from entry.fields`; `R7: tier "everyday" sets price to priceLoggedOut (cloud-bunny-plush → 28)`; `R7: tier "member" sets price to priceAuthenticated (cloud-bunny-plush → 22.4)`; `R7: price follows the tier for every mock entry`; `R7: features is a new array equal to entry.fields.features`; `R7: features is [] when the entry has none` | `src/lib/products/to-catalog-product.test.ts` |
| R8 | `R8: image is null when entry.fields.image is absent (bubble-bath-whale)`; `R8: image is exactly { url, alt, width, height } from the asset`; `R8: alt falls back to the asset title when description is absent`; `R8: alt prefers the asset description over the title`; `R8: width and height are null when file.details.image is absent`; `R8: width and height come from file.details.image`; `R8: a protocol-relative // URL gets an https: prefix`; `R8: a root-relative /products/ URL is unchanged`; `R8: an https:// URL is unchanged` | `src/lib/products/to-catalog-product.test.ts` |
| R9 | `R9: verifySession reads the session cookie by SESSION_COOKIE from next/headers cookies()`; `R9: a valid token resolves to { name, expiresAt }`; `R9: $label resolves to null` (no cookie / tampered token / expired token, signed 8 days ago under fake `Date`); `R9: verifySession is the function returned by React cache()` (`react` mocked with a pass-through `cache`); `R9: a session cookie with SESSION_SECRET unset rejects (no silent logged-out fallback)` (covers all three DAL functions). "No `jose` import in `dal.ts`" is review | `src/lib/dal.test.ts` |
| R10 | `R10: $label → exactly the 8 public CatalogProducts in name order` (no cookie / tampered / expired; deep-equal to the spec mapping); `R10: logged out, every product has priceTier everyday and price = priceLoggedOut`; `R10: logged out, no product is authenticated and none has a priceAuthenticated key` | `src/lib/dal.test.ts` |
| R11 | `R11: with a valid session → all 12 CatalogProducts in name order`; `R11: Set B is mixed into name order, not appended (index 2 is forest-friends-activity-cube)`; `R11: with a valid session, every product has priceTier member and price = priceAuthenticated` | `src/lib/dal.test.ts` |
| R12 | `R12: no session + public slug → found with everyday price 28 (cloud-bunny-plush)`; `R12: no session + Set B slug → requires-login (heirloom-wooden-xylophone)`; `R12: $label + every Set B slug → requires-login`; `R12: no session + every public slug → found with the everyday CatalogProduct`; `R12: no session + unknown slug → not-found (no-such-toy)`; `R12: valid session + Set B slug → found with member price 43.2 (heirloom-wooden-xylophone)`; `R12: valid session + public slug → found with member price 22.4 (cloud-bunny-plush)`; `R12: valid session + unknown slug → not-found`; `R12: a valid session never yields requires-login (every slug is found as member)`; `R12: lookup is an exact, case-sensitive slug match (a prefix is not-found)`; `R12: malformed slug "%s" without a session → not-found, with no product fetch` and `... with a valid session ...` (`""`, `"../etc"`, `"Cloud-Bunny-Plush"`) | `src/lib/dal.test.ts` |
| R13 | `R13: requires-login carries no product data (only the status key)`; `R13: not-found deep-equals { status: "not-found" } with no other keys` | `src/lib/dal.test.ts` |
| R14 | `R14: $label calls cacheTag("products") and cacheLife("hours")` (getProducts and getProductBySlug, logged out and logged in); `R14: each DAL read calls cacheTag and cacheLife again (fetchProducts runs per call under Vitest)`. Not exported, `"use cache"` first, only `sets`, no request data, literal arrays and the source branch: review | `src/lib/dal.test.ts` |
| R16 | `R16: fixture sanity: 12 and 8 products, all categories known`; `R16: returns a new array, even when nothing is filtered out`; `R16: never mutates the input array or its products`; `R16: works on a frozen input (no in-place sort or splice)`; `R16: returns the input product objects with their values unchanged`; `R16: every value in CATEGORIES keeps only products of that category`; `R16: category undefined applies no category filter`; one test per row of the spec's "Expected filter results" table (15 rows, the multi-value rows split per value); `R16: q "$q" (only in $field) matches nothing: q searches name, description, features only` (5 cases) | `src/lib/products/filter.test.ts` |
| R19 | `R19: with the CONTENTFUL_* vars blank, DAL reads never reach contentful` (`contentful` mocked to throw). Guard only: R19 itself is review | `src/lib/dal.test.ts` |

Requirements verified only by `review`: R15, R17, R18, R19. Parts of R2, R9 and R14 are review too (noted above).

**Run output (trimmed):**

```
$ npm test
 FAIL  src/lib/dal.test.ts [ src/lib/dal.test.ts ]
Error: Cannot find package '@/lib/dal' imported from .../src/lib/dal.test.ts
 FAIL  src/lib/products/contentful-adapter.test.ts
Error: Cannot find package '@/lib/products/contentful-adapter' imported from ...
 FAIL  src/lib/products/filter.test.ts
Error: Cannot find package '@/lib/products/filter' imported from ...
 FAIL  src/lib/products/mock-adapter.test.ts
Error: Cannot find package '@/lib/products/mock-adapter' imported from ...
 FAIL  src/lib/products/source.test.ts
Error: Cannot find package '@/lib/products/source' imported from ...
 FAIL  src/lib/products/to-catalog-product.test.ts
Error: Cannot find package '@/lib/products/to-catalog-product' imported from ...
 Test Files  6 failed | 5 passed (11)
      Tests  109 passed (109)          # the 5 passing files are P01's

$ npm run typecheck                     # 11 errors, all TS2307
src/lib/dal.test.ts(40,8): error TS2307: Cannot find module '@/lib/dal'.
src/lib/dal.test.ts(41,37): error TS2307: Cannot find module '@/lib/products/types'.
src/lib/products/contentful-adapter.test.ts(15,41): error TS2307: Cannot find module '@/lib/products/contentful-adapter'.
src/lib/products/filter.test.ts(5,53): error TS2307: Cannot find module '@/lib/products/filter'.
src/lib/products/filter.test.ts(6,37): error TS2307: Cannot find module '@/lib/products/types'.
src/lib/products/mock-adapter.test.ts(8,35): error TS2307: Cannot find module '@/lib/products/mock-adapter'.
src/lib/products/mock-adapter.test.ts(98,34): error TS2307: Cannot find module '@/lib/products/mock-adapter'.
src/lib/products/source.test.ts(4,37): error TS2307: Cannot find module '@/lib/products/source'.
src/lib/products/source.test.ts(36,17): error TS2307: Cannot find module '@/lib/products/source'.
src/lib/products/to-catalog-product.test.ts(5,34): error TS2307: Cannot find module '@/lib/products/to-catalog-product'.
src/lib/products/to-catalog-product.test.ts(6,48): error TS2307: Cannot find module '@/lib/products/types'.

$ npx eslint src/lib/dal.test.ts src/lib/products/*.test.ts
(no output, exit 0)
```

**Why each failure is the expected one:** each of the six new files fails only on importing a module this phase creates (`@/lib/dal`, `@/lib/products/{source,mock-adapter,contentful-adapter,to-catalog-product,filter,types}`). Nothing has been built yet. Typecheck shows only TS2307 for those same modules, and lint is clean.

To confirm the tests are not broken in some other way, I wrote a throwaway reference implementation of the contract in the scratchpad (outside the repo, aliased in through a scratch Vitest config and tsconfig; no repo file touched). Results:
- Against it, all 142 tests pass (dal 41, source 24, mock-adapter 12, contentful-adapter 14, to-catalog-product 20, filter 31), and `tsc` on the test files is clean.
- I then broke the reference one rule at a time. Every broken version is caught: a slug leaking into `requires-login`, logged-out reading Set B, no `cacheLife`/`cacheTag`, no `SLUG_PATTERN` guard, no visibility re-filter in the live adapter, no trimming in source selection, the wrong log format, `q` not trimmed, no `https:` prefix, and `features` not copied.
- One broken version first slipped through: the mock adapter without its sort, because the JSON is already in name order. I added the reversed-file R3 test, which now catches it.

## Post-build

No test was edited in this mode. Test files from the pre-build pass were run as they were.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit`: `✓ Types generated successfully`, exit 0, no errors |
| `npm run lint` | PASS | `eslint`: no output, exit 0 |
| `npm test` | PASS | `Test Files 11 passed (11)`, `Tests 251 passed (251)`, exit 0. That is 109 from P01 plus 142 from P02: dal 41, source 24, mock-adapter 12, contentful-adapter 14, to-catalog-product 20, filter 31. 0 skipped, 0 todo. Run 3 times with the same result, including once with `SESSION_SECRET=` and `CONTENTFUL_*=x/y/z` in the environment, so the tests do not depend on the outer env or `.env.local` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected`, exit 0 |
| `npm run build` | PASS | `✓ Compiled successfully`, `✓ Generating static pages (4/4)`, routes `○ /` and `○ /_not-found`, exit 0. Run twice: once as-is (with `.env.local` loaded), and once with `SESSION_SECRET=` and the three `CONTENTFUL_*` vars exported as empty strings, which shows it builds without `SESSION_SECRET`. No route imports `dal.ts` yet, so this build does not compile the `"use cache"` transform (spec Checks) |
| `scripts/verify-ssr.sh` | n/a (P03) | not part of this phase's Checks |
| `npm run test:e2e` | n/a (P04) | not part of this phase's Checks |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (unit) |
| R2 | PASS (unit). The "no `console.*` in the diff prints an env value" part is for review |
| R3 | PASS (unit) |
| R4 | PASS (unit, `contentful` mocked) |
| R5 | PASS (unit) |
| R6 | PASS (unit) |
| R7 | PASS (unit) |
| R8 | PASS (unit) |
| R9 | PASS (unit). The "no `jose` import in `dal.ts`" part is for review |
| R10 | PASS (unit) |
| R11 | PASS (unit) |
| R12 | PASS (unit) |
| R13 | PASS (unit) |
| R14 | PASS (unit: `cacheTag("products")` and `cacheLife("hours")` on each DAL read). For review: not exported, `"use cache"` first, only `sets`, no request data, literal arrays, source branch |
| R15 | review only (not checked by qa) |
| R16 | PASS (unit) |
| R17 | review only. All six test files start with `import "server-only";` |
| R18 | review only |
| R19 | PASS for the unit guard (DAL reads never reach a throwing `contentful` mock). The rest is for review |

**Overall:** PASS. Every check in the spec's Checks section passed, and every unit-verified requirement passed. R15, R17, R18 and the review parts of R2, R9, R14 and R19 are for the reviewer.

## Dispute

none

## Open issues

- Post-build: I don't think any of my tests are wrong. The tests behind the four pre-build notes below all pass against the build, so the contract assumptions they rely on hold: the JSON is imported via `@/data/products.mock.json`, `cache` comes from `react`, and a malformed slug causes no fetch. The R14 source branch through the DAL is still for review.

- `R3: sorts by name itself, not by the JSON file's order` swaps in a reversed copy of the data with `vi.doMock("@/data/products.mock.json")`. It assumes the adapter imports the JSON as a module through that specifier, which the Contract requires ("All imports use the `@/` alias (... `@/data/products.mock.json`)"). If the builder reads the file with `fs` instead, this test fails, and the failure is a contract deviation, not a test bug.
- `R9: verifySession is the function returned by React cache()` mocks `react` with a pass-through `cache` and checks that `verifySession` is the function it returned. It assumes `cache` is imported from `"react"`, as R9 and the Contract state.
- `R12: malformed slug ... with no product fetch` shows "no fetch" by `cacheTag` never being called. This follows from the Contract ("`!SLUG_PATTERN.test(slug)` → `{ status: "not-found" }` (no fetch)") and from `fetchProducts` calling `cacheTag` (R14).
- R14's source branch (`getProductSource() === "contentful"` → live adapter) is not unit-tested through the DAL. R19 requires DAL tests to run with the `CONTENTFUL_*` vars blank, so that part is left to review. The adapters are covered directly in their own files.

## Where the instructions got in the way

- Vitest 5 defaults to `clearMocks: true`, which wipes `vi.fn` call history before every test. So call history from module import (for example `cache(...)` at load time) can't be asserted inside an `it`. Neither architecture.md Tests nor `.claude/rules/tests.md` mentions this. A one-line note would save the next phase a debugging detour.
- `src/lib/products/*.test.ts` from an earlier pre-build pass were already in the tree, untracked, with no `qa.md`. The role file doesn't say whether to keep or rewrite them. I reviewed them against the spec, kept them and extended one.
