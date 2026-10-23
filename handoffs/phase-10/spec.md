# Phase 10: savings line

**Builder:** ui  ·  **Depends on:** P03 catalog (06d1f58), P07 suspense skeletons (b6b3a9d), P09 savings percent (bb81078), docs commit D-036 (df43efc)  ·  **Written by:** orchestrator

**Read:** architecture.md Server/client boundary, Data access (the `savingsPercent` bullets only), Tests; design.md Components (Badge, Price, Skeleton), Screens: Catalog `/`, Product detail `/products/[slug]`, Accessibility. Builder and reviewer read only these (D-033).

## Goal

Signed-in members see a mint `You save 20%` pill on its own line under every member price: both catalog card variants (right-aligned in Specs first) and the product detail price card. Every price block, signed out included, and every skeleton price block reserves that row at one fixed height, so nothing shifts.

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `Price` takes a required `savingsPercent: number \| null` prop and always renders a savings row (`data-savings-row`) directly under the amount, inside the price block | design.md Components (Price), D-036 | review, e2e |
| R2 | When `tier === "member"` and `savingsPercent` is a number, the row holds `SavingsBadge` with the text `You save <n>%` as **one text node** (e.g. `You save 20%`). Otherwise (everyday tier, or `null`) the row is present and empty: no text, no pill | design.md Components (Price), D-036 | unit (`formatSavings`), verify-ssr, review |
| R3 | `SavingsBadge` uses the shared Badge base (pill, 2 px `foreground` border, 12.8 px (`text-label`) 700) with `bg-quaternary text-foreground`, no icon | design.md Components (Badge), D-036 | review |
| R4 | The row's height comes from one exported constant `PRICE_SAVINGS_ROW` in `src/components/ui-classes.ts` with a fixed height utility (`h-*`, not `min-h-*`); the pill fits inside it without overflow. `Price` and the skeleton price blocks both use that constant; no other file hard-codes the row's height | design.md Components (Price, Skeleton), D-036 | review |
| R5 | `CatalogSkeleton` (every placeholder card) and `ProductDetailSkeleton` (the price card) reserve an empty `PRICE_SAVINGS_ROW` under their amount block; the block is `aria-hidden="true"` and holds no text | design.md Components (Skeleton), architecture.md Server/client boundary, D-031, D-036 | review, e2e (CLS) |
| R6 | `product-card.tsx` and `src/app/products/[slug]/page.tsx` pass `product.savingsPercent` to `Price`. No component or page computes a percent or imports `@/lib/products/savings` | architecture.md Data access, D-036 | review |
| R7 | In the Specs first layout the savings row is right-aligned under the amount (a `group-data-[layout=specs]:` utility); in Price first it is left-aligned. The price is still rendered once per card (no duplicate row) | design.md Screens: Catalog (Card content), D-019, D-036 | e2e, review |
| R8 | The signed-in response bodies of `/`, `/products/cloud-bunny-plush` and `/products/forest-friends-activity-cube` contain `You save 20%`; the signed-out response bodies of `/`, `/?layout=specs`, `/products/cloud-bunny-plush` and `/login` contain no `You save` | architecture.md Tests, D-031, D-036 | verify-ssr |
| R9 | Signed in, at 1280×720 and 375×812, on `/` (both layouts) and on a product page, the pill's top edge is at or below the amount's bottom edge; in Specs first its right edge is within 2 px of the amount's right edge | design.md Screens, D-036 | e2e |
| R10 | The detail price card is the same height signed out and signed in (within 1 px), at 1280×720 and 375×812, for `/products/cloud-bunny-plush` | design.md Screens: Product detail, D-031, D-036 | e2e |
| R11 | The existing layout-shift test still passes (CLS < 0.01 on `/`, `/?category=bath`, `/products/cloud-bunny-plush`, signed out and in, both viewports); every existing verify-ssr and e2e check still passes | architecture.md Tests, D-031 | e2e, verify-ssr |
| R12 | No `'use client'` added; the layout island (`src/components/client/layout-toggle.tsx`) is unchanged and gets no new props; no other visible copy changes | architecture.md Server/client boundary, D-022 | review, `check-client-boundary.sh` |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional.

```ts
// src/components/format.ts
export function formatSavings(percent: number): string   // `You save ${percent}%`

// src/components/badge.tsx
export function SavingsBadge({ percent }: { percent: number }): JSX.Element
//   renders <span className={`${BADGE} bg-quaternary text-foreground`} data-savings>{formatSavings(percent)}</span>

// src/components/price.tsx
export function Price(props: {
  amount: number;
  tier: PriceTier;
  savingsPercent: number | null;   // new, required
  className?: string;
}): JSX.Element

// src/components/ui-classes.ts
export const PRICE_SAVINGS_ROW: string   // fixed height (h-*), flex row, items-center
```

- DOM hooks (for e2e): the amount `<span>` inside `Price` gets `data-price-amount`; the savings row `<div>` gets `data-savings-row`; the pill `<span>` gets `data-savings`. Skeleton rows do not carry these attributes.
- Text: `formatSavings(20)` → `"You save 20%"`; `formatSavings(5)` → `"You save 5%"`; `formatSavings(100)` → `"You save 100%"`. The pill's only child is that one string, so the raw HTML contains `You save 20%` verbatim (React escapes nothing in it).
- Expected data (mock, from P09): every member-tier product has `savingsPercent: 20`; every signed-out product `null`. Signed in, `/` shows 12 cards, each with one `You save 20%` pill (the RSC payload in the same response may repeat the string, so verify-ssr asserts presence, not a count). Public slug for detail checks: `cloud-bunny-plush` ($28.00 everyday, $22.40 member). Set B slug: `forest-friends-activity-cube` ($71.20 member).
- verify-ssr mints its own `session` cookie (P03 → P04 note); the signed-out Set B slug answers 307, so R8's signed-out detail check uses the public slug.

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- `formatSavings` lives in `src/components/format.ts` next to `formatPrice`: it formats a number the DAL computed and does no arithmetic, so it does not break "pages and components never compute it".
- `SavingsBadge` takes the number and formats it itself, so callers cannot split the text into several nodes.
- `Price` decides only "pill or empty row" from `tier` and `savingsPercent`; the empty row is always rendered, which is what keeps the block's height equal in every state.
- The exact `h-*` value of `PRICE_SAVINGS_ROW` is the builder's choice (the pill must fit; about 28 px expected). It is one constant so the card, the detail card and both skeletons stay equal.
- New e2e file `e2e/savings.spec.ts` for R9 and R10, so the existing specs stay untouched apart from what R11 requires.

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/components/price.tsx`, `src/components/badge.tsx`, `src/components/format.ts`, `src/components/ui-classes.ts`, `src/components/product-card.tsx`, `src/components/skeletons.tsx`, `src/app/products/[slug]/page.tsx` |
| qa | `src/components/format.test.ts`, `scripts/verify-ssr.sh`, `e2e/savings.spec.ts` (new), and any existing `e2e/*.spec.ts` only if an existing assertion breaks because of the reserved row (say which, in qa.md) |

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

`npm run test:e2e` is required this phase (the rendered HTML changes; it includes `e2e/layout-shift.spec.ts` for R11).

## Out of scope

- Any signed-out savings teaser, or any `You save` text in a signed-out response (I9).
- Showing the everyday price (struck through or otherwise) next to a member price.
- Changing the detail card's 80 px member note ("Member price applied") or the logged-out sign-in row.
- Any change to `src/lib/**`, `src/schemas/**`, `src/data/**`, Contentful, or the layout island.

## Where the instructions got in the way

none
