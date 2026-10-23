# Phase 12-fix1: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/components/client/price-sort.tsx:124 sets each card's `--i` from `position`, which is the index in the shown order (`shown.map`, :156-157). The `.pop-in` delay is still `calc(var(--i, 0) * 40ms)` (globals.css:188). The tests are at diff.patch:195-228 (signed out asc, desc after asc, signed in 12 cards), and they assert `--i` = DOM position and the computed delay = k×40 ms. | |
| R2 | PASS | `useSortReplays` (price-sort.tsx:107-115) counts only real sort changes. An odd count adds `pop-in-replay` (:125, :151), and `.pop-in.pop-in-replay` switches to an identical keyframe (globals.css:161-170, 196-198), so every card's animation name changes on each sort change. The tests (diff.patch:230-250, 174-193) assert exactly one new `pop-in*` animation per card, started after the click, with visible starts in strictly increasing order. | |
| R3 | PASS | A click on the active option returns before `replaceState` (price-sort.tsx:67), so `current` stays the same and so do `replays`, the order and `--i` (:110). The tests (diff.patch:252-285) cover both cases, after a client sort and with a server-active `?sort=price-asc`, and check every frame for new animations, `--i` changes and reorders. | |
| R4 | PASS | On the server render and hydration, `previous === current`, so `replay` is false and `className` is untouched (price-sort.tsx:108, 125). `shown` is the server order (identity order, or `items`), so `--i` = position = the `index` that ProductCard sets inline (product-card.tsx:33). The test at diff.patch:287-301 checks the inline `--i` of each `<article>` in the raw HTML for `/`, `?sort=price-asc` and `?sort=price-desc`. | |
| R5 | PASS | The only new animation rule, `.pop-in.pop-in-replay`, is inside `@media (prefers-reduced-motion: no-preference)` (globals.css:184, 196-198). The bare `@keyframes` (161-170) animates nothing by itself. The test (diff.patch:303-329) emulates `reduce` and asserts no card animation on load or after asc/desc clicks. | |
| R6 | PASS | `cloneElement` without a key keeps type and key, so the nodes are kept (price-sort.tsx:126). The island still returns a fragment (:157), props are still `sort`/`orders`/`children` (:141-149), and there is no `@/lib` import (:3-18). The diff adds no `appendChild`/`insertBefore` (grep of src). The test (diff.patch:331-371) checks that the same tagged nodes stay direct grid children after asc then desc. | |
| G1 | REVISE | diff.patch:1-10 changes `docs/intervention-log.md`. The spec's owned paths don't include it (ui: price-sort.tsx, product-grid.tsx, product-card.tsx, globals.css; qa: e2e/price-sort.spec.ts), and its Out of scope excludes "any change to … docs". The content is the orchestrator's record of the PR #3 feedback, not builder or qa work. | Phase diff contains only owned paths: take the intervention-log hunk out of this phase's diff and commit it as separate orchestrator bookkeeping, or add it to the spec as an Amendment. No builder or qa change is needed; all code and test hunks are within owned paths. |
| G2 | PASS | No new `'use client'`. The only directive is the existing one in src/components/client/price-sort.tsx:1. | |
| G3 | PASS | The diff has no `instant = false`, no `loading.tsx` and no Suspense or skeleton changes. | |
| G4 | PASS | The diff adds no env reads, `NEXT_PUBLIC_` use or secrets. | |
| G5 | PASS | No new files under src/lib/**. | |
| G6 | PASS | The island's props are unchanged (price-sort.tsx:141-149: sort, integer orders under the D-038 exception, children). It reads only `style`/`className` of the server-rendered card elements (:121-126) and imports nothing from `src/lib/**`. | |

Overall: REVISE

Notes:
- globals.css:159: the comment "No skeleton pulse when the visitor asks for less motion" now sits above the new `@keyframes pop-in-replay` (160-170), separated from the `@media (prefers-reduced-motion: reduce)` block it describes (172). Putting the keyframes above that comment would keep them together. Style only.
- price-sort.tsx:122: an item that isn't a valid element is returned unchanged, so it would keep its server `--i` without any error. This would happen if the RSC payload ever delivered a card as a lazy or unresolved element instead of the rendered `<article>`. The R1/R2 e2e tests cover the environment they run in. If they fail on a single card, check this first.
- After an odd number of sort changes, `pop-in-replay` stays on the cards through later chip, search or Clear-filter navigations. The keyframes are identical and the guard is the same, so this doesn't change behaviour. It also doesn't restart animations on those navigations, which matches Out of scope.
- The code changes are only in src/components/client/price-sort.tsx and src/app/globals.css. product-grid.tsx and product-card.tsx are unchanged, so the public signatures in the Contract hold.

Where the instructions got in the way: Under G1, `agents/reviewer.md` has no verdict that fits a hunk outside owned paths written by the orchestrator, not by a builder. REVISE assumes the owning builder can fix it, and BLOCK escalates to the human for what is diff assembly. I used REVISE and addressed it to the orchestrator.

**Orchestrator decision:** close. G1's REVISE concerns orchestrator bookkeeping only (`docs/intervention-log.md` is orchestrator-owned, append only); `diff.patch` was regenerated excluding it (3 files: e2e/price-sort.spec.ts, globals.css, price-sort.tsx). Every code and test requirement is PASS, so no builder round was used and the reviewer was not re-dispatched (the human asked for a quick validation and push).
