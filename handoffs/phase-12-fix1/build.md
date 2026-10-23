# Phase 12-fix1: Build (ui, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/components/client/price-sort.tsx` | edited: `PriceSortedCards` `cloneElement`s each card (same type and key) with `--i` = shown position. A sort-change counter (state from the previous render; it counts only non-null sort changes) adds `pop-in-replay` to every card when the count is odd. Props, exports and the no-wrapper render are unchanged. | R1, R2, R3, R4, R6 |
| `src/app/globals.css` | edited: top-level `@keyframes pop-in-replay` (copy of `pop-in`) plus `.pop-in.pop-in-replay { animation-name: pop-in-replay }`, inside the existing `prefers-reduced-motion: no-preference` block | R2, R5 |

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
| `npm run test:e2e` | PASS | |

## Open issues

none

## Where the instructions got in the way

none
