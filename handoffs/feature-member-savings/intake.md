# Feature: Member savings line

**Slug:** `member-savings`  ·  **Branch:** `feature/member-savings`  ·  **Decision:** D-036  ·  **Written by:** orchestrator, from the human's answers (D-035)

Read by the architect (to edit the docs) and by the reviewer in docs mode (to check them). Only the human's answers count as decisions; the orchestrator's recommendations are marked as such.

## Request

> show a 'You save X%' line on member prices

## Decisions

| ID | Question | Answer (the human's) | Recommended option? | Changes |
|----|----------|----------------------|---------------------|---------|
| I1 | Where does the line appear for signed-in members? | On every member price: both catalog card variants (Price first, Specs first) and the product detail price card | yes | design.md Components (Price), Screens: Catalog (Card content), Product detail (Logged in) |
| I2 | How does the saving reach the page? | The DAL computes it. `CatalogProduct` gains `savingsPercent: number \| null`: a number only for member-tier products with a saving, `null` for everyday-tier products and when there is no saving. Pages and components only render it; they never compute it and never receive the everyday price for a member-tier product. The logged-out render holds nothing derived from member prices | yes | architecture.md Data access (DAL resolves the price, tier and saving); Server/client boundary (the saving is price data) |
| I3 | Rounding, and when the line is hidden | `savingsPercent = Math.round((1 - memberPrice / everydayPrice) * 100)`, a whole number. It is `null` (line hidden) when the tier is everyday, when the rounded value is 0 or less (member price not lower), or when the everyday price is 0. With the current data every product saves 20% (the float 19.999… for $14.00 → $11.20 rounds to 20) | yes | architecture.md Data access |
| I4 | Exact copy | `You save <n>%`, e.g. `You save 20%`. No other wording, no "vs everyday" | n/a: no option was marked recommended; the human picked the requested wording | design.md Components (Price) |
| I5 | Position inside the price block | On its own line directly under the amount (not on the amount row) | no: recommended was the same row as the amount | design.md Components (Price), Screens: Catalog, Product detail |
| I6 | Style | A pill in Badge style: 2 px `foreground` border, 12.8 px 700, `quaternary` (mint) fill, `foreground` text | yes | design.md Components (Badge or Price) |
| I7 | Space for the new row (skeletons render before the session is known; CLS must stay < 0.01, D-031) | Reserve the row in every state: every price block, signed out, signed in with no saving (`null`), and the matching skeleton blocks, keeps a fixed-height row under the amount, sized by one shared constant in `ui-classes.ts` used by both the component and its skeleton. Signed-out price blocks show that row empty. No layout shift; the CLS test is unchanged | yes | design.md Components (Price, Skeleton), Screens: Catalog, Product detail; architecture.md Server/client boundary (skeleton sizes) only if needed |
| I8 | Specs first card, where the price is one row (`MEMBER PRICE ....... $71.20`) | The pill sits on its own line under the amount, right-aligned | yes | design.md Screens: Catalog (Card content, Specs first) |
| I9 | A savings teaser for signed-out visitors (e.g. "Members save 20%") | No. Out of scope: signed-out renders keep holding nothing derived from member prices | yes | none (Out of scope) |

## Exact copy

Every visible string the feature adds or changes, verbatim. qa's checks grep for these.

| Where | Text |
|-------|------|
| Price block, member tier with a saving (catalog cards, both variants, and the detail price card) | `You save 20%` (template `You save <n>%`, `<n>` = `savingsPercent`) |
| Price block, everyday tier or `savingsPercent: null` | (no text; the reserved row is empty) |

The string must reach the HTML as one text node (`You save 20%`), so a grep of the raw response finds it (React splits `{n}` interpolations into separate text nodes).

## Doc changes

What the architect writes, by file. Each line cites the decisions behind it.

- `docs/architecture.md`: Data access: the DAL also resolves `savingsPercent` per product, with the formula and the `null` cases (I2, I3). Server/client boundary: the savings line is price data, rendered in server components only, never passed to a client island, never in a skeleton (I2). Tests: SSR checks also assert `You save 20%` present with a session and absent without one (I2, I4).
- `docs/design.md`: Components, Price: the savings row under the amount, its copy, the reserved fixed-height row in every state (I4, I5, I7); the mint pill style, as a Badge variant or in the Price row (I6). Components, Skeleton: price blocks in the skeletons reserve the same row height (I7). Screens, Catalog: Card content and the wireframes show the pill under the amount, right-aligned in Specs first (I1, I5, I8). Screens, Product detail: Logged in shows the pill under the amount in the price card; the price card stays the same size in both states (I1, I5, I7).
- `docs/decisions.md`: new row D-036; superseded rows: none.
- `.claude/rules/`: `ssr-rendering.md` and `client-islands.md`: name the savings percent alongside prices (server components only, never an island prop) (I2).

## Data changes

Contentful has no branches: a change here is live on the deployed site before the PR is merged. Additive only.

| Change | Where | Live before merge | Approved by the human |
|--------|-------|-------------------|------------------------|
| none: the saving is computed from the existing `priceLoggedOut` and `priceAuthenticated` fields. No Contentful, `src/schemas/product.ts` or mock change | n/a | no | n/a |

## Build phases

| Phase | Builder | Builds | qa writes first |
|-------|---------|--------|-----------------|
| 09 savings percent | data-auth | `savingsPercent: number \| null` on `CatalogProduct` (`src/lib/products/types.ts`), computed in `src/lib/` for both the mock and live adapters by one pure helper, returned by `getProducts()` and `getProductBySlug()` | Unit: the helper (20 for $14.00 → $11.20 and $28.00 → $22.40; `null` for equal prices, a higher member price, an everyday price of 0; rounding to the nearest whole number); DAL: logged in, every product has `savingsPercent: 20`; logged out, every product has `savingsPercent: null`; `getProductBySlug` carries the same value |
| 10 savings line | ui | The savings row in `Price` (mint pill `You save <n>%`, one text node; empty fixed-height row otherwise) for both card variants (right-aligned under the amount in Specs first) and the detail price card; skeleton price blocks reserve the same row via one shared `ui-classes.ts` constant | verify-ssr: `You save 20%` present in the signed-in `/` and signed-in Set B and public detail responses, absent from every signed-out response; e2e: the pill is below the amount in both layouts; the existing CLS test (< 0.01, signed out and in, both viewports) still passes |

## Out of scope

- Any savings teaser for signed-out visitors (I9).
- Showing the everyday price (struck through or otherwise) next to a member price.
- Any Contentful, schema or mock data change.
- Per-product overrides of the percent or the copy.

## Amendments

none

## Confirmations

| Step | Result | Date |
|------|--------|------|
| Confirm 1 (decisions) | approved | 2026-10-22 |
| Confirm 2 (docs diff) | approved (reviewer notes left as is) | 2026-10-22 |
