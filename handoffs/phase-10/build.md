# Phase 10: Build (ui, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/components/format.ts` | edited: added `formatSavings(percent)` returning `You save ${percent}%` | R2 |
| `src/components/badge.tsx` | edited: added `SavingsBadge` (shared `BADGE` base, `bg-quaternary text-foreground`, `data-savings`, one text node, no icon) | R2, R3 |
| `src/components/ui-classes.ts` | edited: added `PRICE_SAVINGS_ROW = "flex h-7 items-center"` (28 px; pill is about 27.2 px) | R4 |
| `src/components/price.tsx` | edited: required `savingsPercent` prop; amount (`data-price-amount`) and an always-rendered savings row (`data-savings-row`) share an inner column, right-aligned in Specs first via `group-data-[layout=specs]:items-end`; pill only for member tier with a number | R1, R2, R4, R7 |
| `src/components/product-card.tsx` | edited: passes `product.savingsPercent` to `Price` | R6 |
| `src/app/products/[slug]/page.tsx` | edited: passes `product.savingsPercent` to `Price` | R6, R10 |
| `src/components/skeletons.tsx` | edited: `PriceSkeleton` (used by every catalog placeholder card and the detail price card) reserves an empty `aria-hidden` `PRICE_SAVINGS_ROW` under the amount | R4, R5 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (458/458) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS (514 passed, 0 failed) | |
| `npm run test:e2e` | FAIL (run 1: 39 passed, 4 failed; run 2: 40 passed, 3 failed). Only the R4 row-height spread test fails; `layout-shift.spec.ts` and all other specs pass | `R4: signed in <path> (<layout>) at <vp>: ... every row has the same height signed in and out`<br>`Error: savings row heights 28, 28.025, 28.103, 28.198, 28.000, 28.041, 28.127, 28.219, 28.272, 28.237, 28.063, 27.702, 27.109 px differ`<br>`Expected: <= 0.5  Received: 1.16357421875` (`e2e/savings.spec.ts:237`) |

## Open issues

- Disputed test: `e2e/savings.spec.ts` `R4: signed in <path> (<layout>) at <vp>: the pill fits inside its savings row, and every row has the same height signed in and out` (line 211, assertion at 237). Spec line: R4 "a fixed height utility (`h-*`, not `min-h-*`)". The row has a fixed `h-7` (layout height exactly 28 px in every card). The test reads `getBoundingClientRect().height`, which includes the card's `pop-in` transform (`scale(0.9)` to `1` with the bounce easing that overshoots past 1, staggered `--i * 40ms`, so up to about 840 ms for 12 cards). `load()` waits for `networkidle` but not for the animation to end, so the later cards are measured mid-scale (27.1 to 28.3 px). I checked with a throwaway script against `next start` (375x812, signed out `/`): right after `networkidle` the rects read 28.00 to 28.20 px while `offsetHeight` is 28 for every row; 1.5 s later every rect is 28.00 px. The result depends on timing (4 failures in run 1, 3 in run 2). Suggested test-side fix for qa: compare `offsetHeight` (or wait for `document.getAnimations()` to finish, or emulate `reducedMotion: "reduce"`) before measuring. Not changed by me (I don't own tests, and the pop-in animation is design.md Motion).

## Where the instructions got in the way

none
