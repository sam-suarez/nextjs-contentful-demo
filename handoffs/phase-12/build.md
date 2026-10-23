# Phase 12: Build (ui, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/components/catalog-params.ts` | edited: `SORTS`, `CatalogSort`, `CatalogParams.sort`; `parseCatalogParams` validates `sort`; `catalogHref` appends `sort` last | R1, R2 |
| `src/components/client/price-sort.tsx` | created: `PriceSortToggle` (links, `aria-current` → `role="button"` + `aria-pressed` after mount, plain-left-click `replaceState`) and `PriceSortedCards` (`Children.toArray` re-indexed by `orders[current]`, no own element); sort read via `useSearchParams()` + `parseCatalogParams` | R6, R9, R10, R11, R12 |
| `src/components/filter-card.tsx` | edited: Price control (`#sort-label`, group, two options) left of Layout in a new controls column; hidden `sort` input; chips and Layout hrefs keep `sort` | R5, R7, R8 |
| `src/components/product-grid.tsx` | edited: takes `sort` and `orders`, wraps the cards in `PriceSortedCards` inside the grid | R11, R12 |
| `src/app/page.tsx` | edited: `sortProducts(filterProducts(...), params.sort)`, `priceSortOrders(visible)` passed to the grid; still inside the existing `<Suspense>` | R3, R4, R13, R17 |
| `src/components/ui-classes.ts` | edited: `FILTER_CONTROLS`, `SORT_OPTION_WIDTH`, `SORT_OPTION_SIZE`; `FILTER_TOP_ROW` is `contents` below `md` and wraps from `md`; `FILTER_SEARCH_COLUMN` gets `md:min-w-72`; `FILTER_FOOTER_ROW` gets `max-md:order-2` (mobile stack: search, chips, Price, Layout, footer) | R8, R15 |
| `src/components/skeletons.tsx` | edited: `CatalogSkeleton` reserves the Price label + track (two `SORT_OPTION_WIDTH` pills) beside Layout in `FILTER_CONTROLS` | R15 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (515/515) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS (`/` stays ◐) | |
| `scripts/verify-ssr.sh` | PASS (744 passed, 0 failed) | |
| `npm run test:e2e` | FAIL (64 passed, 1 failed; disputed, see Open issues 1) | `price-sort.spec.ts:384 › P12 R10: a Control click on Low to high keeps the browser default …`<br>`Error: a click event reached the window — expect(received).toBeGreaterThan(expected) Expected: > 0 Received: 0` (line 397) |

## Open issues

1. **Disputed test (environment): `P12 R10: a Control click on Low to high keeps the browser default (not prevented, no reorder, URL unchanged)`**, `e2e/price-sort.spec.ts:376` / `:397`. Spec R10: "Modified clicks (meta/ctrl/shift/alt, middle button) keep the browser default". On macOS (darwin), Chromium turns Ctrl+click into a secondary click: it fires `contextmenu`, and no `click` event at all. So the test's precondition `a click event reached the window` can't hold here, whatever the island does. I reproduced this on a bare `page.setContent` page with no app code: Meta → `click`, Control → `contextmenu`, Shift → `click`, Alt → `click`. The island's `isPlainLeftClick` checks `ctrlKey` exactly as `layout-toggle.tsx` does, and the Meta, Shift, Alt and middle-button variants all pass. The test probably passes on Linux CI. qa could make the Control case expect `contextmenu` on darwin, or skip it there. I did not touch the test.
2. Design note for review (R11): with `current === null`, `PriceSortedCards` renders `Children.toArray(children)` in the original order, not the raw `children`. Without a sort that is the same output. The one array shape keeps the same keys in both states, so the first sort click from `/` moves the card nodes instead of remounting them. The R11 expando e2e test depends on this.
3. Layout between 768 and about 830 px (not covered by any test): the search column's new `md:min-w-72` and the wrapping top row put the Price and Layout controls on a second line, right-aligned under the search. The cause is the card width at that size: about 668 px for search (288) plus both controls (~504). From about 830 px up, all three share one row. The skeleton uses the same constants, so it wraps the same way. Probed 320 to 1280 px: no horizontal scroll, options 48 px tall, labels fit the fixed `w-28`.

## Where the instructions got in the way

- R11 says "with `current === null` … it renders the children unchanged". Taken literally (returning raw `children`), React would remount every card on the first sort click from `/`, because the key shape changes and the existing nodes are lost. That breaks R11's own "React moves the existing card DOM nodes". I kept the same order and the same keyed array instead (Open issues 2).
