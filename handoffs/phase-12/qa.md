# Phase 12: QA

## Pre-build

**Tests written:**

Files: `src/components/catalog-params.test.ts` (unit), `scripts/verify-ssr.sh` (new "P12" section, 8 new fetches, 4 helpers), `e2e/price-sort.spec.ts` (new), `e2e/layout-shift.spec.ts` (one route added).

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `P12 R1: SORTS is exactly price-asc then price-desc`; `P12 R1: CatalogSort is the union of the SORTS values` (typecheck, also asserts `CatalogParams["sort"]` is `CatalogSort \| null`); `P12 R1: parseCatalogParams returns sort price-asc / price-desc for exactly …`; `… uses the first element of an array sort`; `… validates the first element of an array sort`; `… maps an absent / empty / unknown (name) / PRICE-ASC / empty-array sort to null`; `… returns every field with a valid sort`. Existing exact-object tests updated with `sort: null`: `R10: … empty object returns the defaults`, `R10: … ignores unknown keys`, `R10: … never throws …`, `R11: catalogHref round-trips …` | `src/components/catalog-params.test.ts` |
| R2 | `P12 R2: catalogHref with only sort price-asc`; `… appends sort last after category, q and layout`; `… keeps sort last whatever the input order`; `… omits a null sort`; `… keeps sort when the default price layout is omitted`; `… of a full parsed params object without sort is unchanged`; `… with sort round-trips through parseCatalogParams`. All 12 pre-existing `R11: catalogHref …` tests kept unchanged | `src/components/catalog-params.test.ts` |
| R3 | `P12 R3: [<page>] status 200` and `contains '>N toys<'` for 8 sorted / bogus URLs (8, 12, 2, 1 toys) | `scripts/verify-ssr.sh` |
| R4 | `P12 R4: / (signed out|signed in) cards in name order`; `/?sort=price-asc|price-desc (signed out|signed in) …` (exact `<h2>` name sequence, 8 and 12 names); `/?sort=bogus …`, `/?sort=PRICE-ASC …` name order; `/?category=rattles-teethers&sort=price-asc renders Starlight Teether Ring before Ocean Wave Rattle` | `scripts/verify-ssr.sh` |
| R5 | `P12 R5: [<page>] <p id="sort-label">Price</p>, one role=group aria-labelledby=sort-label holding Low to high then High to low` (13 pages); `P12 R5/R6: [<page>] one <a>Low to high</a> / <a>High to low</a>, href=…` (hrefs per page, incl. category / q / layout combinations) | `scripts/verify-ssr.sh` |
| R6 | Server: the `P12 R5/R6` option lines also pin `aria-current` (`true` only on the active option, absent with no / invalid sort) and no `aria-pressed` / `role`; `P12 R6: [<page>] no 'aria-pressed' / no 'role="button"' anywhere in the server HTML`. Hydrated: `P12 R6: after hydration on / both Price options are <a> with role=button and aria-pressed=false`; `P12 R6/R9: after hydration on /?sort=price-desc High to low is pressed …` | `scripts/verify-ssr.sh`, `e2e/price-sort.spec.ts` |
| R7 | `P12 R7: [sort_combo] hidden <input> name="sort" value="price-desc"` (+ category / layout hidden inputs still present); `… Plush chip href is /?category=plush&q=duck&layout=specs&sort=price-desc`; All + 5 other chips keep q, layout, sort; `Price first` / `Specs first` hrefs keep category, q, sort; `Clear filters href is /`; the same set on `/?sort=price-asc`; `Low to high` on `sort_combo` is `/?category=bath&q=duck&layout=specs&sort=price-asc` (R5/R6 rows); `no <input> with name="sort" when sort is not set` (6 pages); `[sort_bogus] All chip href has no sort` | `scripts/verify-ssr.sh` |
| R8 | `P12 R8: from md up (1280x720) the Price control sits to the left of Layout on the same row` (+ options ≥ 48 px); `P12 R8: below md (375 px / 320 px) the filter card stacks search, chips, Price, Layout, then count and Clear filters` (+ options ≥ 48 px, no horizontal scroll) | `e2e/price-sort.spec.ts` |
| R9 | `P12 R6/R9: after hydration on /?sort=price-desc High to low is pressed and the cards are in descending order`; every R14 click test checks the toggle's `aria-pressed` and the card order agree with the replaced URL | `e2e/price-sort.spec.ts` |
| R10 | `P12 R14/R10: signed out, Low to high reorders the cards in place, replaces the URL and makes no request` (window marker, `history.length`, replaceState spy, no pushState, click reached `window` with `defaultPrevented === true`, no `document` request, no non-prefetch RSC request); `P12 R14/R10: … High to low after Low to high …`; `P12 R14/R10: clicking the active High to low again changes nothing`; `P12 R10: clicking the server-active option on /?sort=price-asc changes nothing`; `P12 R10: a Meta / Control / Shift / Alt / middle button click on Low to high keeps the browser default (not prevented, no reorder, URL unchanged)` | `e2e/price-sort.spec.ts` |
| R11 | `P12 R11: hydration keeps the server order and logs no hydration error (/ and /?sort=price-asc)`; `P12 R11: a sort click moves the existing card DOM nodes, which stay direct children of the grid` (expando tags on card nodes survive and come back in order 7,6,3,0,2,4,1,5; same grid node; grid child count = card count; grid `display` is grid); `P12 R11: after a sort click, Tab order follows the new card order` | `e2e/price-sort.spec.ts` |
| R12 | `P12 R12: [sort_asc|sort_desc] signed out lacks authenticated names / member prices / You save, contains everyday prices`; `[sort_*_member] signed in contains Set B names and member prices, lacks everyday prices`; `P12 R12: / (signed in) orders prop follows member prices over 12 cards` (`[11,10,6,0,4,7,1,9,8,3,5,2]` / reverse, derived from the contract's member prices); `/?sort=price-asc (signed in) orders prop is the identity and its reverse over 12 cards` | `scripts/verify-ssr.sh` |
| R13 | `P12 R13: / (signed out) orders prop is {price-asc:[7,6,3,0,2,4,1,5],price-desc:[5,1,4,2,0,3,6,7]}`; `P12 R13: /?sort=price-asc (signed out) orders prop is the identity and its reverse` (backslashes stripped from the body, then a fixed-string search for `"orders":{…}`) | `scripts/verify-ssr.sh` |
| R14 | `P12 R14/R10: …` (signed out ascending, exact reverse, active click), `P12 R14: signed in, Low to high gives the 12-name ascending order with Set B included` (+ High to low reverse, no navigation) (the Layout-after-sort test was removed by amendment A1, see Dispute) | `e2e/price-sort.spec.ts` |
| R15 | `R10: /?sort=price-desc logged out|logged in at 1280x720|375 px: skeletons replaced, CLS below 0.01, real content visible` (4 new cases in the existing loop; also assert the first visible card is the contract's first `price-desc` name and the Price group is visible) | `e2e/layout-shift.spec.ts` |
| R16 | All existing unit, verify-ssr and e2e checks kept and run unchanged (only the four `catalog-params.test.ts` exact-object expectations gain `sort: null`); P12 R4 name-order checks on `/` (both states) | all |
| R17 | Command `scripts/check-client-boundary.sh` (Checks section) | — |

Requirements verified only by `review`: none in full. Review-only parts: R3 (the page, not a component, calls `sortProducts` / `priceSortOrders`; no price comparison under `src/components/` or `src/app/`), R5 (Segmented control visual style, label uppercase style), R8 (wireframe fidelity beyond the box checks), R9 (`useSearchParams()` through `parseCatalogParams`, `sort` prop fallback), R11 (`Children.toArray` re-index, no `appendChild` / `insertBefore` / refs, unchanged children when `current === null` or an order's length differs), R12 (island prop types, no `@/lib/**` import in `price-sort.tsx`), R15 (skeleton sizes from shared `ui-classes.ts` constants), R17 (no `instant` export, no `loading.tsx`, catalog stays inside its `<Suspense>`).

**Run summary:** (pre-build; for the build, `catalog-params.test.ts` was moved aside once and put back, as agents/qa.md describes)

- `npm run typecheck`: FAIL, 17 errors, all in `src/components/catalog-params.test.ts`: 2× TS2305 (`SORTS`, `CatalogSort` not exported), 10× TS2339 (`sort` does not exist on `CatalogParams`), 5× TS2353 (`sort` not in `Partial<CatalogParams>`). `e2e/*.ts` and `scripts` type-check clean.
- `npx eslint` on the three changed / new test files: clean.
- `npm test`: 18 files, 515 tests: 20 failed, 495 passed. Failures: the 16 new P12 R1/R2 tests listed below plus the 4 updated exact-object tests. Passing new tests: `CatalogSort is the union …` (type-only at runtime; fails under typecheck), `catalogHref omits a null sort`, `catalogHref of a full parsed params object without sort is unchanged` (guards for unchanged behaviour).
- `scripts/verify-ssr.sh`: build OK; 681 PASS, 63 FAIL, every FAIL is a `P12` line; all pre-P12 assertions pass.
  - FAIL: R4 sorted orders (5), R13 / R12 orders prop (4), R5 / R6 Price control on 13 pages (39), R7 carry-over (15).
  - PASS (as they should already): R4 name order on `/` (both states), `/?sort=bogus`, `/?sort=PRICE-ASC`; R3 status / counts; R12 both-direction price / Set B checks on the sorted URLs; R6 no `aria-pressed` / `role="button"` in server HTML; R7 no hidden `sort` input without sort, Clear filters `/`, hidden category / layout inputs, `[sort_bogus]` All chip without sort.
- `npx playwright test e2e/price-sort.spec.ts e2e/layout-shift.spec.ts`: 23 failed, 12 passed (the 12 pre-existing layout-shift cases).
  ```
  1) layout-shift.spec.ts:127 › R10: /?sort=price-desc logged out at 1280x720 … Error: expect(locator).toHaveText(expected) failed
  2-4) same for logged in at 1280x720, logged out / logged in at 375 px
  5-23) price-sort.spec.ts (all 19 tests) … Error: expect(locator).toHaveAttribute(expected) failed
        (waitForSortIsland: no <a>Low to high</a> / <a>High to low</a> with aria-pressed)
  ```

**Why each failure is the expected one:**

- Unit / typecheck: `catalog-params.ts` has no `SORTS`, `CatalogSort` or `sort` field yet (R1, R2 not built). Runtime: `SORTS` is `undefined`, `parseCatalogParams(...).sort` is `undefined` (not `null` / the value), `catalogHref` drops `sort`, and the exact-object `toEqual`s lack `sort: null`.
- verify-ssr: the page ignores `sort` (cards stay in name order, no `orders` prop is serialized), there is no Price control (`label=-|groups=0`, no `Low to high` / `High to low` anchors), and `catalogHref` does not carry `sort` into chip / layout hrefs or a hidden input. I inspected the kept artifacts: e.g. `sort_combo` Plush chip is `/?category=plush&amp;q=duck&amp;layout=specs` (no `sort`), so the helpers parse correctly and fail on the missing feature. Both new parsers (`sort-control.mjs`, `payload.mjs`) were also checked once on a synthetic fixture with the spec's DOM / flight shapes and return the passing result.
- e2e price-sort: every test first waits for the island (`aria-pressed` on both Price options), which does not exist. To be sure the code after that gate is not broken, I ran a throwaway spec (deleted afterwards) on the same build: the card `<h2>` reader, `checkVisibility` filter, card-link reader, grid detection (`display: grid`, 8 direct children), the search / All chip / `8 toys` / Clear filters / Price first locators and the overflow probe all resolve at 1280, 375 and 320 px.
- e2e layout-shift: on `/?sort=price-desc` the first card is still `Bubble Bath Whale` (name order) instead of `Shape Sorter Cube` / `Forest Friends Activity Cube`; CLS itself passed. The 12 existing cases still pass.

## Post-build

Output only for a FAIL, at most 15 lines per check.

Run after the Dispute fix below (build round 1), from the repo root, darwin, in the order listed. The only test change is the Control-click case in `e2e/price-sort.spec.ts` (see Dispute), so that file's hash no longer matches `tests.sha`. Every other locked test file is untouched.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS (exit 0) | |
| `npm run lint` | PASS (exit 0) | |
| `npm test` | PASS: 18 files, 515 / 515 tests | |
| `scripts/check-client-boundary.sh` | PASS (`OK: client boundary respected`) | |
| `npm run build` | PASS (exit 0; `/` is Partial Prerender as before) | |
| `scripts/verify-ssr.sh` | PASS: 744 passed, 0 failed (exit 0) | |
| `npm run test:e2e` | PASS: 65 passed, 0 failed, 0 skipped, 0 flaky (18 in `price-sort.spec.ts`, 4 new `/?sort=price-desc` cases in `layout-shift.spec.ts`) | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (unit P12 R1 + typecheck) |
| R2 | PASS (unit P12 R2; all 12 pre-existing R11 `catalogHref` tests unchanged and passing) |
| R3 | PASS for verify-ssr (status 200, counts 8 / 12 / 2 / 1). The rest (the page calls `sortProducts` / `priceSortOrders`, no price comparison in components) is review-only |
| R4 | PASS (verify-ssr: sorted orders signed out / in, exact reverse, bogus / PRICE-ASC / `/` name order, rattles-teethers) |
| R5 | PASS (verify-ssr: label, group, options, hrefs on 13 pages). Visual style is review-only |
| R6 | PASS (verify-ssr server `aria-current`, no `aria-pressed` / `role="button"` in HTML; e2e after hydration) |
| R7 | PASS (verify-ssr carry-over: hidden input, chips, Layout hrefs, Price hrefs, Clear filters) |
| R8 | PASS (e2e at 1280, 375, 320 px). Wireframe fidelity is review-only |
| R9 | PASS (e2e). The `useSearchParams()` / fallback wiring is review-only |
| R10 | PASS (e2e: reorder, replaceState, no document / RSC request, active click no-op; Meta / Control / Shift / Alt / middle keep the default) |
| R11 | PASS (e2e: no hydration error, DOM nodes moved and still direct grid children, Tab order follows). The `Children.toArray` / no-manual-move parts are review-only |
| R12 | PASS (verify-ssr: both-direction Set B / price checks on sorted URLs, signed-in orders prop). Prop types and imports are review-only |
| R13 | PASS (verify-ssr: exact `orders` on `/` and `/?sort=price-asc`) |
| R14 | PASS (e2e signed out asc / desc / active no-op, signed in 12-name asc + reverse) |
| R15 | PASS (e2e CLS < 0.01 on `/?sort=price-desc`, logged out / in, 1280x720 and 375x812). Shared `ui-classes.ts` sizes are review-only |
| R16 | PASS (every pre-existing unit, verify-ssr and e2e check passes) |
| R17 | PASS (command `scripts/check-client-boundary.sh`). No `instant` / `loading.tsx` / Suspense parts are review-only |

**Overall:** PASS

## Dispute

Mode `dispute`, amendment A1 (2026-10-23, the human, OI-3).

| Test | File | Spec line | Decision | Reason |
|------|------|-----------|----------|--------|
| `P12 R14: on server-sorted /?sort=price-asc, toggling Layout keeps the ascending card order` | `e2e/price-sort.spec.ts` | R14 last sentence ("After a sort click, toggling Layout keeps the sorted card order"), removed by A1 | changed (test deleted) | A1 removes the sentence because it contradicted the D-038 known limitation (architecture.md Filtering and layout) and names this test for removal; nothing is tested about the Layout toggle and the sort island together. |
| constant `SPECS_FIRST` | `e2e/price-sort.spec.ts` | same | changed (deleted) | Used only by the removed test; leaving it would fail `npm run lint` (unused variable). `PRICE_FIRST` stays (used by the R8 tests). |

No other test, assertion or file changed. After the edit: `npx eslint e2e/price-sort.spec.ts` clean; `npx playwright test e2e/price-sort.spec.ts --list` shows 18 tests (was 19); typecheck shows the same 17 pre-build errors as before, all in `src/components/catalog-params.test.ts` (contract not built yet), none in `e2e/`.

Mode `post-build` with `Disputes: handoffs/phase-12/build.md` (build round 1, Open issue 1).

| Test | File | Spec line | Decision | Reason |
|------|------|-----------|----------|--------|
| `P12 R10: a Control click on Low to high keeps the browser default (not prevented, no reorder, URL unchanged)` | `e2e/price-sort.spec.ts` (the `MODIFIED_CLICKS` Control entry and the `installSpies` window listener) | R10: "Modified clicks (meta/ctrl/shift/alt, middle button) keep the browser default" | changed | The test assumed a Ctrl+click always produces a `click` event, which is platform behaviour, not something the spec asks for. I reproduced it on a bare `page.setContent` page with no app code, on darwin: Meta / Shift / Alt → `mousedown`, `click`; Control → `mousedown`, `contextmenu` (no `click`). On macOS the browser default for Ctrl+click is the context menu. The fix: the window spy also records `contextmenu`, and the Control case expects `contextmenu` when `process.platform === "darwin"` and `click` elsewhere. Every other assertion is unchanged: the event reached the window, it was not default-prevented, no reorder, URL stays `/`, nothing pressed, no `replaceState` to another URL. Nothing is weakened. On darwin the test now also checks that the island does not prevent the context menu. |

No other test changed. Meta, Shift, Alt and middle-button cases unchanged. `npx eslint e2e/price-sort.spec.ts` clean.

## Open issues

1. **Resolved by amendment A1 (sentence dropped, test removed; see Dispute).** **R14 last sentence vs architecture.md known limitation (escalation; no test written for it as worded).** R14: "After a sort click, toggling Layout keeps the sorted card order." architecture.md, Filtering and layout, Known limitation (D-038): "after a client-side sort, … a layout toggle uses the `sort` value from the last server render". On `/`, after a `Low to high` click the Layout toggle replaces the URL with its server href `/?layout=specs` (no `sort`); per R9 both islands read the sort from `useSearchParams()`, so `PriceSortedCards` sees `null` and, per R11, renders the children unchanged, i.e. name order. So R14 as written cannot pass without breaking R9, R11 or the documented limitation (and "Do not change `layout-toggle.tsx`"). I did not guess. I wrote the consistent variant instead: `P12 R14: on server-sorted /?sort=price-asc, toggling Layout keeps the ascending card order` (the URL becomes `/?layout=specs&sort=price-asc` and the order stays ascending). Orchestrator: confirm this variant, or amend R14 / architecture.md and name the test to add.
2. **R8 mobile order differs from the current build (observation, not a test problem).** At 375 px the current filter card stacks search (y 336), Layout (y 497), then the chips (y 571). R8 requires search, chips, Price, Layout, so the builder must also move Layout below the chips on mobile. No existing check pins the current order, so this does not conflict with R16. Flagging so the reviewer and builder read it as intended, not as a regression.
3. **R13 / R12 key order.** The `orders` checks match the exact serialized text `"orders":{"price-asc":[…],"price-desc":[…]}` as the spec gives it (key order `price-asc` then `price-desc`, prop named `orders`). An implementation that builds the record in the other key order would fail these checks.

4. **Post-build: R8 between 768 and about 830 px is not covered by any test (for the reviewer).** The R8 e2e checks only 1280, 375 and 320 px. The builder reports (build.md Open issue 3) that between 768 and about 830 px, Price and Layout wrap to a second line under the search. R8 says "from `md` up the Price control sits in the filter card's right column, to the left of Layout". Price is still left of Layout on a shared row in that range, but whether a wrapped right column still counts as "the right column" is a call for review. I did not add a test (tests are locked post-build). Apart from the Dispute fix above, I don't think any of my tests is wrong.

## Where the instructions got in the way

- Spec Contract says `catalog-params.test.ts` asserts whole objects "at three places". There are four: `R11: catalogHref round-trips through parseCatalogParams` also compares with `toEqual(params)`, so its `params` gained `sort: null`. No assertion was weakened.
- The pre-build hook message treats every typecheck error other than TS2307 / TS2305 / TS2614 as a test bug. Here 15 of the 17 errors are TS2339 / TS2353 (`sort` missing on the existing `CatalogParams` type), which are just as much "contract not built yet". A type gaining a field can't produce a missing-module or missing-export code.
