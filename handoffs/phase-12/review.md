# Phase 12: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/components/catalog-params.ts:1100-1104 export `SORTS` (`as const`, asc then desc), `CatalogSort` and `sort: CatalogSort \| null`. :1113-1127 (diff) use `first()` and an exact, case-sensitive `isSort`, so anything else becomes `null`. Unit tests at diff 1002-1054 cover every contract example. | |
| R2 | PASS | catalog-params.ts diff:1139 sets `sort` last, only when it is a valid sort, so existing outputs without `sort` don't change. Tests at diff 1056-1090 check the order, the null case and round-trips. | |
| R3 | PASS | src/app/page.tsx:52-54 run `parseCatalogParams`, then `filterProducts`, then `sortProducts(..., params.sort)`; :58 count is `visible.length`; :60 `priceSortOrders(visible)`. A grep of `src/components` finds no price comparison. | |
| R4 | PASS | Server order comes from `sortProducts` (page.tsx:54; src/lib/products/sort.ts:28-31). verify-ssr diff 778-787 asserts every case: signed out and in, bogus, uppercase, and rattles. | |
| R5 | PASS | src/components/filter-card.tsx:67-76: `<p id="sort-label" className={LABEL}>Price</p>`, a group with `role="group" aria-labelledby="sort-label"` and `LAYOUT_TRACK`, and hrefs from `catalogHref({ ...params, sort })`. price-sort.tsx diff 1162-1165, 1223 give the options in order with `LAYOUT_OPTION` plus the width constant. | |
| R6 | PASS | price-sort.tsx diff 1212-1215: before mount (`useSyncExternalStore` server snapshot is false), only the active option has `aria-current="true"`; after mount both get `role="button"` and `aria-pressed`. This is the same pattern as layout-toggle.tsx:81-83. | |
| R7 | PASS | filter-card.tsx:57 adds the hidden `sort` input only when set; :91-92 Layout hrefs, :103 and :110 chip hrefs carry `sort`; :73-74 Price hrefs spread `params`; :120 Clear filters stays `href="/"`. verify-ssr diff 869-908 covers the example. | |
| R8 | PASS | ui-classes.ts diff 1489, 1495 and 1526: `contents` plus `max-md:order-1` and `order-2` stack search, chips, Price, Layout, footer below `md`. From `md`, `FILTER_CONTROLS` puts Price before Layout with `md:ml-auto`; options use `min-h-12` (ui-classes.ts:9). e2e diff 584-629 checks 1280, 375 and 320. | |
| R9 | PASS | price-sort.tsx diff 1183-1186: `useSearchParams()` through `parseCatalogParams`, with the prop as fallback (`PriceSortedCards` passes `sort`). Same as `LayoutProvider` (layout-toggle.tsx:42-43). | |
| R10 | PASS | price-sort.tsx diff 1202-1207: modified and non-left clicks return before `preventDefault`. A click on the active option is prevented and then does nothing. Otherwise `window.history.replaceState(null, "", hrefs[next])`. Links have `prefetch={false}`. e2e diff 329-468 covers all of this. | |
| R11 | PASS | price-sort.tsx diff 1251-1257: a fragment only (no own element), `Children.toArray` re-indexed by `orders[current]`, children unchanged when the sort is null or the lengths differ, and no refs or DOM calls. Keys come from product-grid.tsx diff 1411 (`key={product.id}`). | |
| R12 | PASS | Toggle props are `hrefs` only (diff 1198). Cards props are `sort`, `orders` and `children` (diff 1242-1250; product-grid.tsx diff 1409). Imports are react, next/link, next/navigation, catalog-params and ui-classes only (diff 1151-1156). Member-derived integer orders are allowed by D-038 (architecture.md:39). | |
| R13 | PASS | Orders are computed on the rendered list (page.tsx:60; sort.ts:34-38), so the server's own sort is the identity. verify-ssr diff 823-830 asserts both contract payloads, plus the signed-in ones. | |
| R14 | PASS | e2e diff 329-412 (asc order, URL, `aria-pressed`, window marker, no document or RSC request, reverse, active click does nothing) and 470-496 (signed-in 12-name order). The layout-after-sort test removed by A1 is not in the diff. | |
| R15 | PASS | skeletons.tsx:153-161 reserves the Price label and a track of two `SORT_OPTION_WIDTH` pills inside the same `FILTER_CONTROLS` and order classes. The control uses the same constant through `SORT_OPTION_SIZE` (ui-classes.ts diff 1515-1518). layout-shift.spec.ts diff 30-35 adds `/?sort=price-desc`, run for both states and both viewports (VIEWPORTS :21-24, STATES :53-56). | |
| R16 | PASS | Existing test changes are only `sort: null` added to whole-object expectations (diff 970-996). verify-ssr and layout-shift only add checks. layout-toggle.tsx is unchanged. Empty state and card `index` are unchanged (page.tsx:62; product-grid.tsx diff 1410-1411). | |
| R17 | PASS | The only new `'use client'` is src/components/client/price-sort.tsx (diff 1149). Catalog is still inside `<Suspense fallback={<CatalogSkeleton />}>` (page.tsx:31-33). No `instant` export or `loading.tsx` in the diff. | |
| G1 | PASS | Every file in the diff is ui-owned (catalog-params.ts, client/price-sort.tsx, filter-card.tsx, product-grid.tsx, skeletons.tsx, ui-classes.ts, app/page.tsx) or qa-owned (catalog-params.test.ts, verify-ssr.sh, e2e/price-sort.spec.ts, e2e/layout-shift.spec.ts). | |
| G2 | PASS | `'use client'` appears only at price-sort.tsx:1, under src/components/client/. | |
| G3 | PASS | No `instant` and no `loading.tsx`. The request-reading catalog stays inside its Suspense with `CatalogSkeleton`, whose new blocks are text-free `aria-hidden` pills (skeletons.tsx:155-161). | |
| G4 | PASS | No `NEXT_PUBLIC_` reads, secrets or logging in the diff. The test session secret is read from playwright.config (e2e diff 255-261), as existing specs do. | |
| G5 | PASS | No new file under src/lib/**. | |
| G6 | PASS | Applying R12 / D-038: the islands get hrefs, the sort, integer orders and server-rendered children only. No prices, product lists, Set B or session data, and no `@/lib` imports (price-sort.tsx diff 1151-1156). | |

Overall: PASS

Notes:
- Mobile reading and focus order: below `md`, `FILTER_TOP_ROW` becomes `contents` and order is set with `max-md:order-1` / `order-2` (ui-classes.ts diff 1489, 1495, 1526). The screen shows search, chips, Price, Layout, footer. Keyboard and screen readers follow the DOM: search, Price, Layout, chips, footer. That meets R8 as written, but the visual order and DOM order differ (WCAG 1.3.2 / 2.4.3). It may be worth a design decision.
- `md:flex-wrap` plus `md:min-w-72` on search (ui-classes.ts diff 1489, 1492): just above `md`, the Price and Layout controls drop below the search, right-aligned, instead of sharing its row. This is my estimate, not a measurement: it happens until roughly 860 px wide. R8's e2e checks only 1280 px. Price is still left of Layout; worth a quick look at 768 to 900 px.
- Each Price option has a fixed `w-28` with `whitespace-nowrap` (ui-classes.ts diff 1515-1518). That leaves about 76 px for the label. If "Low to high" or "High to low" renders wider in the real font, the text runs into the option's padding. Worth a visual check.
- With equal prices, `price-desc` breaks ties by name A to Z (sort.ts:13), so it is not the exact reverse of `price-asc` in that case. The mock data has no equal prices, so the contract holds; this is as documented in architecture.md:58.

Where the instructions got in the way: R8 ("from `md` up the Price control sits in the filter card's right column") does not cover the narrow widths just above `md`, where search plus both segmented controls may not fit on one row. The builder chose to wrap the controls there, and the spec gives no rule to judge that choice against. The G6 / architecture.md:38 vs D-038 tension was settled by the spec's R12 note, and I applied it.

**Orchestrator decision:** close; the three layout notes go to the human check
