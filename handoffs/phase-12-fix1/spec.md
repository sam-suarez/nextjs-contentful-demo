# Phase 12-fix1: pop-in order after a client sort

**Builder:** ui  ·  **Depends on:** P12 price sort control (461cd9c), PR #3 open  ·  **Written by:** orchestrator

**Read:** design.md Motion (Pop-in), Filtering and layout controls (Sort control); architecture.md Filtering and layout. Builder and reviewer read only these (D-033).

## Goal

PR #3 feedback from the human (2026-10-23): "when i click the price sort options, the popup animations of the cards are not in the correct order." Today the island reorders the cards, the browser replays the pop-in only on the cards React happened to move, and each keeps the `--i` stagger of its **server** position. After this fix, a sort click replays the pop-in on every visible card, staggered by its **new** position, so the cards pop in first-to-last in the order shown.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | After a plain click on an inactive Price option, every visible card's `--i` equals its 0-based position in the new order (DOM order), so its computed `animation-delay` is `position × 40ms` (`0s`, `0.04s`, `0.08s`, …) | design.md Motion (Pop-in: `animation-delay: calc(var(--i) * 40ms)`), human feedback | e2e |
| R2 | That click restarts the pop-in on **every** visible card, not only on cards whose DOM node moved: after the click each card has exactly one `pop-in` animation whose start is after the click (e.g. `getAnimations()` on each card: one animation, `currentTime` smaller than the time since the click). Cards therefore appear first-to-last in the new order | human feedback, design.md Motion | e2e |
| R3 | A click on the already-active option restarts nothing and changes no `--i` (D-038 I6: it does nothing) | design.md Filtering and layout controls, D-038 | e2e |
| R4 | The server HTML is unchanged: each card's inline `--i` is its server-rendered position, so the first-load stagger and the no-JS page are as before | design.md Motion ("set from the server via an inline style … works without JavaScript") | verify-ssr (existing checks stay green), review |
| R5 | `prefers-reduced-motion: reduce` still disables the pop-in entirely, including any restart mechanism added here (no animation runs on a sort click under reduced motion) | design.md Motion | e2e |
| R6 | Every phase 12 requirement still holds: React keyed reorder with no manual DOM moves (`appendChild`/`insertBefore`) and no card remount (the existing card DOM nodes are kept), `PriceSortedCards` renders no DOM element of its own, island props are unchanged (`sort`, `orders`, `children`; no prices, slugs, Set B or session data), no `@/lib` import in the island, CLS on load stays < 0.01; all existing unit, verify-ssr and e2e tests pass | phase 12 spec R11, R12, R15, R16; architecture.md Server/client boundary (D-038) | e2e, verify-ssr, review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`). For G6 the D-038 exception in phase 12 R12 still applies (integer orders only).

## Contract

- Card hook: the card root is the element carrying `.pop-in` and the inline `--i` (`src/components/product-card.tsx`, the `<article>` inside the grid). qa reads `getComputedStyle(card).animationDelay`, `card.style.getPropertyValue("--i")` and `card.getAnimations()` on `article` elements in DOM order.
- Mock data order after `Low to high` from `/` (signed out): Sunny Duck Bath Squirter (`--i` 0), Starlight Teether Ring (1), Ocean Wave Rattle (2), Bubble Bath Whale (3), Jingle Ball Trio (4), Rainbow Ring Stacker (5), Cloud Bunny Plush (6), Shape Sorter Cube (7).
- Public exports of `price-sort.tsx`, `ProductGrid` and `ProductCard` keep their phase 12 signatures.

### Contract decisions

- No doc change: design.md defines the stagger as `--i × 40 ms` with `--i` the card's position; keeping `--i` equal to the shown position after a client reorder restores that rule rather than changing it. The server still sets `--i` inline (R4).
- Mechanism is the builder's choice within R6. One way that meets every requirement: in `PriceSortedCards`, `cloneElement` each card with its new position in `style["--i"]`, and restart the CSS animation on all cards by alternating between two identical keyframes (e.g. `pop-in` / `pop-in-replay`, chosen by a counter that changes only on a real sort change), with the alternate keyframe under the same reduced-motion guard in `globals.css`. Remounting cards (changing keys) is not allowed (R6).

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/components/client/price-sort.tsx`, `src/components/product-grid.tsx`, `src/components/product-card.tsx`, `src/app/globals.css` |
| qa | `e2e/price-sort.spec.ts` |

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

- Re-animating cards on the Layout toggle, chip clicks or search (unchanged).
- Any change to sorting, the Price control, URLs, skeletons, `src/lib/**` or docs.
- The React DevTools console error the human saw: it disappears with extensions disabled and does not reproduce in a clean Chromium (not an app bug; intervention log).

## Amendments

none

## Where the instructions got in the way

- Orchestrator: phase 12's spec put the re-stagger out of scope ("ProductCard's `index` prop keeps the server render order"), assuming moved cards would not replay their animation. Moving a DOM node restarts its CSS animation, so the human saw a partial, out-of-order replay.
