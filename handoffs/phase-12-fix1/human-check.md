# Phase 12-fix1: Human check

**Status:** closed (commit `<sha>`)
**Result:** <pending: the human asked to validate quickly and push; check on PR #3>

## Escalation

none

## Verify it yourself (about 5 minutes)

On `feature/price-sort`, with your dev server on :3000 (it hot-reloads; a hard reload picks up the CSS).

1. `http://localhost:3000/`: the cards pop in left-to-right, top-to-bottom on load (unchanged).
2. Click **Low to high**: **every** card pops in again, starting with the first card shown (Sunny Duck Bath Squirter) and following the new order.
3. Click **High to low**: all cards replay again, first card shown (Shape Sorter Cube) first.
4. Click **High to low** again: nothing animates.
5. macOS System Settings → Accessibility → Display → Reduce motion on, reload: no pop-in on load or on sort clicks; cards fully visible.
6. Optional: `npx playwright test e2e/price-sort.spec.ts -g "P12-fix1"` → `10 passed`.

## Result

Passed / failed (what you saw) — tell me in the thread, or leave a review comment on PR #3.
