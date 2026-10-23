# Phase 12-fix1: QA

## Pre-build

**Tests written** (all in `e2e/price-sort.spec.ts`, appended after the phase 12 tests; the phase 12 tests are unchanged):

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `P12-fix1 R1: signed out, Low to high sets each card's --i and animation-delay to its new position` | `e2e/price-sort.spec.ts` |
| R1 | `P12-fix1 R1: High to low after Low to high re-staggers every card by its new position` | `e2e/price-sort.spec.ts` |
| R1 | `P12-fix1 R1: signed in, Low to high staggers all 12 visible cards (Set B included) by position` | `e2e/price-sort.spec.ts` |
| R2 | `P12-fix1 R2: Low to high restarts the pop-in on every card (moved or not), first-to-last` | `e2e/price-sort.spec.ts` |
| R2 | `P12-fix1 R2: a second sort (High to low after Low to high) restarts the pop-in on every card again` | `e2e/price-sort.spec.ts` |
| R3 | `P12-fix1 R3: clicking the active High to low after a client sort restarts nothing and keeps every --i` | `e2e/price-sort.spec.ts` |
| R3 | `P12-fix1 R3: clicking the server-active Low to high on /?sort=price-asc restarts nothing and keeps --i 0..7` | `e2e/price-sort.spec.ts` |
| R4 | `P12-fix1 R4: the server HTML gives each card an inline --i equal to its server-rendered position` (HTTP via Playwright `request`, for `/`, `/?sort=price-asc`, `/?sort=price-desc`; added on top of the existing verify-ssr checks) | `e2e/price-sort.spec.ts` |
| R5 | `P12-fix1 R5: with prefers-reduced-motion: reduce no card animation runs on load or on sort clicks` | `e2e/price-sort.spec.ts` |
| R6 | `P12-fix1 R6: Low to high then High to low keeps the same card DOM nodes as direct grid children (no remount)`, plus every existing phase 12 e2e test (P12 R11 same nodes / direct grid children / Tab order), `e2e/layout-shift.spec.ts` (CLS < 0.01, including a sorted URL) and `scripts/verify-ssr.sh` | `e2e/price-sort.spec.ts`, existing files |

Requirements verified only by `review`: none. Review also covers R4 (server render unchanged) and R6 (island props, no `@/lib` import in the island, no `appendChild`/`insertBefore`).

How the checks read the cards (Contract card hook). They look at the visible `article` elements in DOM order, using `style.getPropertyValue("--i")`, `getComputedStyle().animationDelay` and `getAnimations()`. A "pop-in animation" is a `CSSAnimation` whose `animationName` contains `pop-in`. That accepts `pop-in` and the Contract's example `pop-in-replay`. Right before each click, the test records every existing `Animation` object and the timeline time `t0`, then samples every animation frame for up to 2 s.
- R2 passes when each card has exactly one pop-in animation that is a **new object**, with a `startTime` no earlier than `t0` minus one frame (20 ms). The pop-ins must also become visible (`startTime + delay`) strictly first-to-last in DOM order.
- R3 and R5 sample for 1 s and fail if any frame shows a new or pending animation, an animation started after the click, or (R3 only) a changed `--i` or order.

Validation that the checks can pass: a temporary probe test (since removed) simulated a correct fix in the page. It set `--i` to each card's DOM index and restarted every card's animation (`animation: none`, reflow, restore). R1 and R2 both passed against it. Without the `--i` part, R2 failed only on the first-to-last ordering, as it should. The probe also showed why the 20 ms tolerance is needed: a restarted composited animation's `startTime` resolved 0.04 ms *before* `t0` (2155.372 vs 2155.414).

**Run summary:** `npm run build` passed. Lint and `tsc` showed no errors in `e2e/price-sort.spec.ts`. `npx playwright test e2e/price-sort.spec.ts` gave **5 failed, 23 passed**: all 18 phase 12 tests pass, 5 of the new tests fail and 5 pass. With `-g P12-fix1 --repeat-each=3` the result was 15 failed and 15 passed, the same tests every time (not flaky).

```
✘ P12-fix1 R1: signed out, Low to high ...            Error: each card's --i equals its 0-based DOM position
     received --i "7","6","3","0","2","4","1","5" (server name-order positions), expected "0".."7"
✘ P12-fix1 R1: High to low after Low to high ...      Error: each card's --i equals its 0-based DOM position
✘ P12-fix1 R1: signed in, Low to high (12 cards) ...  Error: each card's --i equals its 0-based DOM position
✘ P12-fix1 R2: Low to high restarts ...               Error: every card has exactly one pop-in animation, started after the click
     Sunny Duck Bath Squirter: popIns 1, restartedAfterClick false   (the 7 moved cards: true)
✘ P12-fix1 R2: a second sort ...                      Error: every card has exactly one pop-in animation, started after the click
     Shape Sorter Cube: popIns 1, restartedAfterClick false          (the 7 moved cards: true)
✓ P12-fix1 R3 (x2), R4, R5, R6
```

**Why each failure is the expected one:**
- R1 (3 tests): the island reorders the cards but each one keeps the inline `--i` of its server position, so `--i` and `animation-delay` follow the old order. This is the bug the spec describes.
- R2 (2 tests): React moves 7 of the 8 card nodes, and that restarts their CSS animation. The one node it leaves in place (Sunny Duck Bath Squirter after Low to high, Shape Sorter Cube after High to low) keeps its finished page-load animation. This is the human's "only on the cards React happened to move".
- R3, R4, R5 and R6 pass before the build, as expected. They guard behaviour that already holds and that the fix must not break:
  - R3: clicking the active option does nothing.
  - R4: the server `--i` equals the server position.
  - R5: reduced motion disables the pop-in.
  - R6: no remount, no wrapper element.

  They have to stay green once the restart mechanism is added. The detection they rely on is the same new-animation detection that catches the R2 failures above.

## Post-build

Output only for a FAIL, at most 15 lines per check.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (18 files, 515 tests) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | |
| `scripts/verify-ssr.sh` | PASS (744 passed, 0 failed) | |
| `npm run test:e2e` | PASS (75 passed, 0 failed, 0 flaky, 0 skipped) | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (3 e2e) |
| R2 | PASS (2 e2e) |
| R3 | PASS (2 e2e) |
| R4 | PASS (e2e + verify-ssr; review covers the rest) |
| R5 | PASS (e2e) |
| R6 | PASS (e2e, verify-ssr, boundary script; island props and DOM-move rules left to review) |

**Overall:** PASS

## Dispute

none

## Open issues

none

## Where the instructions got in the way

- Spec R2 suggests the check "`currentTime` smaller than the time since the click". Taken literally, that is flaky for composited animations: Chromium resolves a restarted animation's start time slightly before the click's `document.timeline.currentTime`. The check is instead "a new `Animation` object, started no earlier than one frame before the click". This follows the intent of R2 and is no weaker: animations from before the click are always rejected by object identity.
