# Phase 09: Build (data-auth, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/products/savings.ts` | created: `import "server-only";` + `savingsPercent(everydayPrice, memberPrice)`; `everydayPrice <= 0` → null before dividing, rounded result `<= 0` → null (covers `-0`) | R1, R2 |
| `src/lib/products/types.ts` | edited: `CatalogProduct` gains `savingsPercent: number \| null`, nothing else | R3 |
| `src/lib/products/to-catalog-product.ts` | edited: sets `savingsPercent` via the helper for tier `member`, `null` for `everyday` (member price not read); the only computation site, so both adapters inherit it | R4, R5, R6, R7 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (454/454) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS (495 passed, 0 failed) | |

## Open issues

none

## Where the instructions got in the way

none
