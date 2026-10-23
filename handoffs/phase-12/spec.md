# Phase 12: price sort control

**Builder:** ui  ·  **Depends on:** P05 layout toggle (f7dff1f), P07 suspense skeletons (b6b3a9d), P10 savings line (457e87f), P11 price sort helper (7f83272), docs commit D-038 (9d7708e)  ·  **Written by:** orchestrator

**Read:** architecture.md Routes (`/`), Server/client boundary, Data access (Price sort helper), Filtering and layout, Tests; design.md Components (Segmented control, Skeleton), Screens: Catalog, Filtering and layout controls, Responsive, Accessibility. Builder and reviewer read only these (D-033).

## Goal

The catalog `/` gets a "Price" segmented control ("Low to high" / "High to low") beside Layout. The server renders the grid in the order the URL's `sort` asks for, so the first HTML and no-JS visits are already sorted. With JS, a small island reorders the server-rendered cards in place with no request, using only per-option index orders computed on the server by the phase 11 helper.

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `src/components/catalog-params.ts` exports `SORTS` and `CatalogSort`; `CatalogParams` gains `sort: CatalogSort \| null`. `parseCatalogParams` returns `sort: "price-asc"` / `"price-desc"` for exactly those values (first value of an array, case-sensitive), else `null` (absent, empty, unknown such as `"name"`, `"PRICE-ASC"`) | architecture.md Filtering and layout, D-038 I7 | unit |
| R2 | `catalogHref` appends `sort` last when it is set (keys in the order `category`, `q`, `layout`, `sort`) and omits it when `null`/absent; every existing output without `sort` is unchanged | architecture.md Filtering and layout, D-038 I7 | unit |
| R3 | `/` validates `sort` with `parseCatalogParams`, filters with `filterProducts`, then calls `sortProducts(visible, params.sort)` from `@/lib/products/sort`; the count is the filtered length (unchanged). The page (not a component) calls `sortProducts` and `priceSortOrders`; no file under `src/components/` or `src/app/` compares prices itself | architecture.md Filtering and layout, Data access ("Pages call it"), D-038 | review, verify-ssr |
| R4 | Server HTML order: signed out, `/?sort=price-asc` renders the 8 card names in the contract's ascending order and `/?sort=price-desc` in the exact reverse; signed in (session cookie), the 12 names in the contract's ascending order and the exact reverse; `/?sort=bogus` and `/` render name order; `/?category=rattles-teethers&sort=price-asc` renders `Starlight Teether Ring` before `Ocean Wave Rattle` | architecture.md Tests (D-038), D-038 I3 | verify-ssr |
| R5 | The filter card has the Price control: a label `Price` (one text node, uppercase label style, `id="sort-label"`) above a `role="group"` with `aria-labelledby="sort-label"`, holding two links `Low to high` (href `catalogHref({ ...params, sort: "price-asc" })`) and `High to low` (href `catalogHref({ ...params, sort: "price-desc" })`), in that order. Visual style is the existing Segmented control (same track and option classes as Layout) | design.md Components (Segmented control), Filtering and layout controls, D-038 I4, I5 | verify-ssr, review |
| R6 | Server HTML state: with no valid `sort`, neither option has `aria-current`; with `sort=price-asc` only `Low to high` has `aria-current="true"` (likewise `High to low` for `price-desc`). After hydration the options carry `role="button"` and `aria-pressed` (`true` on the active one, `false` otherwise), as the Layout control does | design.md Components (Segmented control), Filtering and layout controls, D-038 I4 | verify-ssr, e2e |
| R7 | `sort` carries over: the search form has `<input type="hidden" name="sort" value="<sort>">` only when `sort` is set; every category chip href and both Layout hrefs include the current `sort`; both Price hrefs keep the current `q`, `category` and `layout`; Clear filters stays `href="/"`. Example: on `/?category=bath&q=duck&layout=specs&sort=price-desc` the "Plush" chip href is `/?category=plush&q=duck&layout=specs&sort=price-desc` and `Low to high` is `/?category=bath&q=duck&layout=specs&sort=price-asc` | architecture.md Filtering and layout, design.md Filtering and layout controls, D-038 I7 | verify-ssr |
| R8 | Placement: from `md` up the Price control sits in the filter card's right column, to the left of Layout; below `md` the filter card stacks search, chips, Price, Layout, then count and Clear filters. No horizontal scroll at 320 px; each option is at least 48 px tall | design.md Screens: Catalog (wireframe), Responsive, D-038 I8 | e2e, review |
| R9 | `src/components/client/price-sort.tsx` (`'use client'`) exports `PriceSortToggle` and `PriceSortedCards` (contract). The current sort is read from `useSearchParams()` through `parseCatalogParams` (the `sort` prop is the fallback when search params are unavailable), as `LayoutProvider` does | architecture.md Filtering and layout, design.md Filtering and layout controls, D-038 I1 | review, e2e |
| R10 | With JS, a plain left click on an inactive option calls `event.preventDefault()`, reorders the cards to that option's order, and replaces the URL with that option's href via `window.history.replaceState`; no document request and no RSC fetch happen. A click on the active option does nothing (no reorder, no URL change). Modified clicks (meta/ctrl/shift/alt, middle button) keep the browser default | architecture.md Filtering and layout, design.md Filtering and layout controls, D-038 I1, I6 | e2e |
| R11 | `PriceSortedCards` renders no DOM element of its own (the cards stay direct children of the grid element) and reorders through React: it renders `Children.toArray(children)` re-indexed by `orders[current]` (keyed elements, so React moves the existing card DOM nodes; DOM and focus order follow). It never moves DOM nodes by hand (`appendChild`, `insertBefore`, refs). With `current === null`, or when an order's length differs from the number of children, it renders the children unchanged | architecture.md Filtering and layout ("reorders the real DOM children … focus order follows"), D-038 I1; docs-review note | review, e2e |
| R12 | Island props hold only: `PriceSortToggle` → `hrefs: Record<CatalogSort, string>`; `PriceSortedCards` → `sort: CatalogSort \| null`, `orders: Record<CatalogSort, number[]>` (from `priceSortOrders`), and the server-rendered cards as `children`. No price, `savingsPercent`, slug, name, Set B data or session data is passed as a prop. `price-sort.tsx` imports nothing from `@/lib/**` (types included). Signed-in index orders derive from member prices; architecture.md Server/client boundary (D-038) allows exactly these integer orders, so this is not a breach of the "never session data" rule or reviewer G6 | architecture.md Server/client boundary (D-038 bullet), D-038 I1 | review, verify-ssr |
| R13 | The serialized `orders` prop in the signed-out `/` response is `{"price-asc":[7,6,3,0,2,4,1,5],"price-desc":[5,1,4,2,0,3,6,7]}` (the RSC payload may escape quotes); on `/?sort=price-asc` it is `{"price-asc":[0,1,2,3,4,5,6,7],"price-desc":[7,6,5,4,3,2,1,0]}` | architecture.md Server/client boundary, D-038 I1 | verify-ssr |
| R14 | e2e, signed out, 1280×720: on `/`, clicking `Low to high` shows the card `h2`s in the contract's ascending order (DOM order), the URL becomes `/?sort=price-asc`, `aria-pressed` is `true` on it and `false` on `High to low`, and the page did not navigate (a `window` marker set before the click survives, no `document` request); clicking `High to low` gives the exact reverse and `/?sort=price-desc`; clicking `High to low` again changes nothing. Signed in: `Low to high` gives the 12-name ascending order with Set B included. (Layout-after-sort sentence removed: amendment A1) | architecture.md Tests (D-038), D-038 I1, I3, I6 | e2e |
| R15 | The catalog skeleton (`CatalogSkeleton`) reserves the Price control beside the Layout control (label block and pill track at the real control's size, sizes from shared `ui-classes.ts` constants used by both the control and the skeleton). The CLS e2e (`e2e/layout-shift.spec.ts`) also covers `/?sort=price-desc`, logged out and in, at 1280×720 and 375×812, and stays below 0.01 | design.md Components (Skeleton), architecture.md Tests, D-031, D-038 I8 | e2e, review |
| R16 | Unchanged behaviour: the Layout toggle, the category chips, search, Clear filters, the count, the empty state, `Price`/savings rendering and the product detail page work as before; every existing verify-ssr and e2e assertion still passes (only `catalog-params.test.ts` exact-object assertions gain `sort: null`) | architecture.md Filtering and layout, D-019, D-036 | verify-ssr, e2e, unit |
| R17 | `'use client'` appears only in `src/components/client/`; `scripts/check-client-boundary.sh` passes; no `instant` export or `loading.tsx` is added; the catalog stays inside its existing `<Suspense>` boundary | architecture.md Server/client boundary, D-022, D-031 | review, command |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`). For G6, apply R12: the per-option integer orders are the one prop architecture.md allows the sort island (D-038).

## Contract

Exact names qa tests against. Nothing here is optional.

```ts
// src/components/catalog-params.ts  (isomorphic; no @/lib imports)
export const SORTS: readonly ["price-asc", "price-desc"];  // `as const`, this order
export type CatalogSort = (typeof SORTS)[number];          // "price-asc" | "price-desc"
export type CatalogParams = { category: Category | null; q: string; layout: CatalogLayout; sort: CatalogSort | null };
export function parseCatalogParams(searchParams: RawSearchParams): CatalogParams;   // + sort (R1)
export function catalogHref(params: Partial<CatalogParams>): string;               // + sort last (R2)

// src/components/client/price-sort.tsx  ('use client'; imports only react, next/link, next/navigation, @/components/catalog-params, @/components/ui-classes)
export function PriceSortToggle({ hrefs }: { hrefs: Record<CatalogSort, string> }): JSX.Element;
export function PriceSortedCards({ sort, orders, children }: {
  sort: CatalogSort | null;
  orders: Record<CatalogSort, number[]>;
  children: ReactNode;
}): JSX.Element;

// src/components/product-grid.tsx
export function ProductGrid({ products, sort, orders }: {
  products: CatalogProduct[];          // already filtered and sorted by the page
  sort: CatalogSort | null;
  orders: Record<CatalogSort, number[]>;
}): JSX.Element;
```

- `parseCatalogParams` examples: `{}` → `{ category: null, q: "", layout: "price", sort: null }`; `{ sort: "price-desc" }` → `sort: "price-desc"`; `{ sort: ["price-asc", "price-desc"] }` → `"price-asc"`; `{ sort: "name" }`, `{ sort: "" }`, `{ sort: "PRICE-ASC" }` → `null`.
- `catalogHref` examples: `{ sort: "price-asc" }` → `/?sort=price-asc`; `{ category: "bath", q: "duck", layout: "specs", sort: "price-desc" }` → `/?category=bath&q=duck&layout=specs&sort=price-desc`; `{ category: "bath", sort: null }` → `/?category=bath`.
- `catalog-params.test.ts` currently asserts whole `CatalogParams` objects (`toEqual({ category, q, layout })` at three places); qa adds `sort: null` (or the expected value) there. That is the only existing test whose expectations change.
- Exact copy (design.md, D-038 I5): label `Price`; options `Low to high` (`price-asc`), `High to low` (`price-desc`). Each one text node.
- DOM: label `<p id="sort-label">`; group `role="group" aria-labelledby="sort-label"`; options are `<a>` (Next `Link`, `prefetch={false}`), server HTML `aria-current="true"` on the active one only, after mount `role="button"` + `aria-pressed`.
- Expected data (mock, `getProducts()` order is name order; card names as rendered in `<h2>`):
  - Signed out, `price-asc` (8): Sunny Duck Bath Squirter ($9.00), Starlight Teether Ring ($11.00), Ocean Wave Rattle ($12.00), Bubble Bath Whale ($14.00), Jingle Ball Trio ($16.00), Rainbow Ring Stacker ($24.00), Cloud Bunny Plush ($28.00), Shape Sorter Cube ($32.00). `price-desc`: exact reverse.
  - Signed in, `price-asc` (12): Sunny Duck Bath Squirter ($7.20), Starlight Teether Ring ($8.80), Ocean Wave Rattle ($9.60), Bubble Bath Whale ($11.20), Jingle Ball Trio ($12.80), Rainbow Ring Stacker ($19.20), Cloud Bunny Plush ($22.40), Shape Sorter Cube ($25.60), Sensory Crinkle Book Set ($28.80), Heirloom Wooden Xylophone ($43.20), Moonbeam Musical Mobile ($54.40), Forest Friends Activity Cube ($71.20). `price-desc`: exact reverse.
  - Name order (no or unknown `sort`), signed out: Bubble Bath Whale, Cloud Bunny Plush, Jingle Ball Trio, Ocean Wave Rattle, Rainbow Ring Stacker, Shape Sorter Cube, Starlight Teether Ring, Sunny Duck Bath Squirter.
  - `/?category=rattles-teethers&sort=price-asc` (signed out): Starlight Teether Ring, Ocean Wave Rattle (name order is the reverse).
- Phase 11 helper (as built, server-only): `sortProducts(products, sort)`, `priceSortOrders(products): Record<PriceSort, number[]>` from `@/lib/products/sort`; `PriceSort` is structurally identical to `CatalogSort`.

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- One island file `price-sort.tsx` with two exports and no context provider: both read the current sort from `useSearchParams()`, which Next keeps in sync with `history.replaceState` (the P05 `LayoutProvider` pattern), so the toggle in the filter card and the cards in the grid agree without shared state.
- `orders` are computed on the list the server renders (already sorted by the URL's `sort`), so the server's own option maps to the identity order and the first client render matches the server HTML (no reorder on hydration, no layout shift).
- Reordering goes through React (`Children.toArray` + re-index) rather than DOM moves, per the docs-review note on D-038: manual moves would desynchronise React's tree on a later update or soft navigation (R11).
- `CatalogSort` is declared in the isomorphic `catalog-params.ts` instead of importing `PriceSort` from the server-only module, so the island never imports from `@/lib/**` (R12).
- `ProductCard`'s `index` prop (animation stagger) keeps the server render order; the stagger is not recomputed after a client reorder.

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/components/catalog-params.ts`, `src/components/client/price-sort.tsx` (new), `src/components/filter-card.tsx`, `src/components/product-grid.tsx`, `src/components/skeletons.tsx`, `src/components/ui-classes.ts`, `src/app/page.tsx` |
| qa | `src/components/catalog-params.test.ts`, `scripts/verify-ssr.sh`, `e2e/price-sort.spec.ts` (new), `e2e/layout-shift.spec.ts` |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
npm run test:e2e
```

## Out of scope

- A "Name" option, toggling a price sort off, or any other sort key (D-038 I2, I6).
- Updating server-rendered links (chips, search, layout hrefs) after a client-side sort or layout toggle: a recorded known limitation (D-038 I9). Do not change `layout-toggle.tsx`.
- Any change to `src/lib/**` (phase 11 is done), the product detail page, `Price`, the savings line, Contentful, `src/schemas/**` or mock data.
- Re-staggering the card pop-in animation after a client reorder.

## Amendments

- **A1 (2026-10-23, the human, OI-3):** R14's last sentence ("After a sort click, toggling Layout keeps the sorted card order") is removed. It contradicted the D-038 known limitation (architecture.md Filtering and layout): a layout toggle after a client-side sort writes the `sort` from the last server render. Nothing is tested about the layout toggle and the sort island together; qa removes the test written for that sentence (`P12 R14: on server-sorted /?sort=price-asc, toggling Layout keeps the ascending card order`). Options offered: qa's consistent version (recommended), drop the sentence (chosen), reopen I9.

## Where the instructions got in the way

- Orchestrator: architecture.md:38 still says islands "never receive … session data" with no exception, and reviewer G6 reads the same way; line 39 (D-038) is the narrow exception. Stated in R12 and under the requirements table so the review applies D-038 (docs-review note; the human declined a tidy-up round).
