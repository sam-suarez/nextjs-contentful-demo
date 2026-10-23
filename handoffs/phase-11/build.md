# Phase 11: Build (data-auth, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/products/sort.ts` | created: `PriceSort`, `PRICE_SORTS`, `sortProducts`, `priceSortOrders`; one index-order comparator (price, then name `localeCompare "en"`, then input index) shared by both exports | R1-R9 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS | |

## Open issues

none

## Where the instructions got in the way

none
