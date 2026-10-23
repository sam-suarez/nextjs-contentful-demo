# Feature: Price sort

**Slug:** `price-sort`  ·  **Branch:** `feature/price-sort`  ·  **Decision:** D-038  ·  **Written by:** orchestrator, from the human's answers (D-035)

Read by the architect (to edit the docs) and by the reviewer in docs mode (to check them). Only the human's answers count as decisions; the orchestrator's recommendations are marked as such.

## Request

> create a client side filter to sort the product price ascending and descending

## Decisions

| ID | Question | Answer (the human's) | Recommended option? | Changes |
|----|----------|----------------------|---------------------|---------|
| I1 | How does the sort run, given that prices render only in server components and islands never receive prices? | **Client reorder, no refetch.** The server sorts the grid by a URL `sort` param (initial HTML and no-JS visits are in the right order). A client island in `src/components/client/` receives only the current sort and, for each sort option, the card order as a list of indices into the rendered cards (numbers only: no prices, no slugs, no Set B data), plus the server-rendered cards as `children`. A click reorders the real DOM (so focus order follows), updates the URL with `history.replaceState`, and makes no request. The island's options are real links, so it works without JS | yes | architecture.md Server/client boundary, Filtering and layout, Data access (pure sort helper in `src/lib/`), Tests; design.md Filtering and layout controls |
| I2 | Which sort options? | **Two options: price ascending and price descending.** No option is active by default; with no `sort` param the grid keeps today's name order | no: recommended was three options (Name, price ↑, price ↓) | architecture.md Filtering and layout; design.md Components (Segmented control), Catalog, Filtering and layout controls |
| I3 | Which price decides the order, and how are ties broken? | **The price the visitor sees**: the everyday price when signed out, the member price (the DAL-resolved price for the tier) when signed in, members-only products included in the same order. **Equal prices fall back to name A–Z** (the existing name order). The signed-out order uses nothing derived from member prices | yes | architecture.md Filtering and layout, Data access |
| I4 | What does the control look like? | **The existing Segmented control**, real links (works without JS); with the island, the active option exposes `aria-pressed`, without it the active link has `aria-current` (same as Layout) | yes | design.md Components (Segmented control), Filtering and layout controls |
| I5 | Copy | **Label "Price"** (uppercase label style, like "Layout"); **options "Low to high" (`price-asc`) and "High to low" (`price-desc`)** | yes | design.md Catalog wireframe, Filtering and layout controls |
| I6 | Clicking the option that is already active | **Nothing: it stays sorted.** The only way back to name order is Clear filters (or editing the URL) | no: recommended was "back to name order" (toggle off) | design.md Filtering and layout controls |
| I7 | How `sort` carries over | **Kept by all, cleared by Clear.** URL values `sort=price-asc` / `sort=price-desc`; unknown values are ignored (name order). The search form (hidden input), the category chips and the layout links keep `sort`; the sort links keep `q`, `category` and `layout`. Clear filters (`<Link href="/">`) drops it | yes | architecture.md Filtering and layout; design.md Filtering and layout controls |
| I8 | Placement | **Beside Layout, in the filter card's right column**, to its left from `md` up. Below `md` the filter card stacks: search, chips, Price, Layout, then count and Clear filters. The filter card skeleton reserves the control's space so CLS stays below 0.01 (D-031) | yes | design.md Catalog wireframe, Responsive, Components (Skeleton) |
| I9 | With JS, a sort click rewrites the URL without a server render, so the server-rendered chip links, search form and layout links still carry the `sort` from the last server render (the layout toggle has the same gap today) | **Accept it, like layout.** Recorded as a known limitation: after a client-side sort, a chip click, a search or a layout toggle uses the `sort` value from the last server render (and after a client-side layout toggle, a sort click writes the `layout` value from the last server render). Not fixed in this feature, for sort or for layout | no: recommended was "the island updates the links too" | architecture.md Filtering and layout (known limitation); decisions.md D-038 |

## Exact copy

Every visible string the feature adds or changes, verbatim. qa's checks grep for these.

| Where | Text |
|-------|------|
| Sort control label (filter card) | `Price` |
| Sort option, ascending (`sort=price-asc`) | `Low to high` |
| Sort option, descending (`sort=price-desc`) | `High to low` |

## Doc changes

What the architect writes, by file. Each line cites the decisions behind it.

- `docs/architecture.md`:
  - Routes: the `/` row says the grid is sorted by name, or by price when `sort` is set (I2, I3).
  - Server/client boundary: the sort island receives only the current sort and per-option index orders (numbers computed on the server) plus server-rendered `children`; never prices, slugs or Set B data (I1).
  - Data access: a pure, server-only sort helper in `src/lib/products/` sorts `CatalogProduct`s by the visitor's resolved price (ties by name) and computes the index orders; pages call it, they never compare prices themselves (I1, I3).
  - Filtering and layout: `sort` (`price-asc` | `price-desc`) joins `category`, `q`, `layout`; validated like the others (unknown ignored, absent = name order); the server filters, then sorts; which controls keep `sort` and which drop it; the sort island (reorders DOM children, `history.replaceState`, real links without JS, active option click does nothing); the known stale-link limitation shared with the layout toggle (I1, I2, I6, I7, I9).
  - Tests: SSR checks that `/?sort=price-asc` and `/?sort=price-desc` render the cards in price order both signed out (everyday prices) and signed in (member prices, Set B included), and that an unknown `sort` renders name order; an e2e check that a sort click reorders the cards with no navigation and updates the URL; the CLS check covers a sorted URL (I1, I3, I8).
- `docs/design.md`:
  - Components: Segmented control row also covers the sort control (label "Price", options "Low to high" / "High to low", no active option by default) (I4, I5).
  - Screens, Catalog: wireframe shows the Price control beside Layout; the Products bullet says name order unless a price sort is active (I2, I8).
  - Filtering and layout controls: a Sort control bullet (links keep `q`, `category`, `layout`; island behaviour; active click does nothing); Search hidden inputs and Category chips also keep `sort`; Layout links keep `sort`; Clear filters drops it (I4, I6, I7).
  - Components, Skeleton: the catalog filter card skeleton reserves the Price control (I8).
  - Responsive: filter card stacking order below `md` (I8).
  - Who builds what: the new phases (11, 12).
- `docs/decisions.md`: new row D-038; superseded rows: none (amends D-019's list of URL params).
- `.claude/rules/`: none expected; the architect updates a rule only if one lists the URL params or the client islands by name.

## Data changes

Contentful has no branches: a change here is live on the deployed site before the PR is merged. Additive only.

| Change | Where | Live before merge | Approved by the human |
|--------|-------|-------------------|------------------------|
| none | | no | n/a |

## Build phases

| Phase | Builder | Builds | qa writes first |
|-------|---------|--------|-----------------|
| 11 price sort helper | data-auth | Pure server-only helper in `src/lib/products/` (`import "server-only"`): sort `CatalogProduct[]` by the resolved price ascending / descending with name A–Z ties (no `sort` = input order unchanged), and compute, for a rendered list, the index order for each sort option | Unit: mock data signed out and signed in sorted both ways (exact slug orders), ties by name, no `sort` keeps input order, index orders map the rendered list to each sorted order, input array not mutated, signed-out result uses no member price |
| 12 price sort control | ui | `sort` in `src/components/catalog-params.ts` (validation); `/` sorts after filtering via the phase 11 helper; Price segmented control in the filter card (links keeping `q`/`category`/`layout`); search hidden input, chips and layout links keep `sort`; sort island in `src/components/client/` (index orders + `children`, DOM reorder, `replaceState`, `aria-pressed`; active click does nothing); filter card skeleton reserves the control | Unit: `parseCatalogParams` accepts `price-asc`/`price-desc`, ignores others; verify-ssr: both sorts in price order signed out and in, unknown `sort` = name order, control copy and links present, hidden input and chip/layout hrefs keep `sort`, no prices in the island's props; e2e: sort click reorders cards with no navigation and updates the URL and `aria-pressed`, JS-free link URL renders sorted; CLS < 0.01 on a sorted URL |

## Out of scope

- A "Name" option or toggling a price sort off (I2, I6); Clear filters is the way back.
- Keeping server-rendered links current after a client-side sort or layout toggle (I9).
- Sorting on any other key (name descending, newest, savings).
- Sorting on the product detail page; remembering the sort in a cookie or across visits.
- Contentful, schema or mock data changes.

## Amendments

none

## Confirmations

| Step | Result | Date |
|------|--------|------|
| Confirm 1 (decisions) | approved | 2026-10-23 |
| Confirm 2 (docs diff) | approved as is (tidy-ups offered and declined: D-038 I1 options wording, architecture.md:38 exception wording, Routes row) | 2026-10-23 |
