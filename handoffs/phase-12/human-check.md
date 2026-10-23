# Phase 12: Human check

**Status:** closed (commit `461cd9c`)
**Result:** PASSED (2026-10-23)

## Escalation

OI-3 (resolved): `spec.md` R14's last sentence contradicted the D-038 known limitation; the human chose to drop it (amendment A1).

## Verify it yourself (about 10 minutes)

Run from the repo root, on `feature/price-sort`. `npm run dev` (port 3000; stop any dev server already running there first), then open `http://localhost:3000/`.

1. Signed out, `/`: the filter card shows **PRICE** with "Low to high" / "High to low" to the left of **LAYOUT**; neither option is active. Cards are in name order (Bubble Bath Whale first).
2. Click **Low to high**: cards reorder instantly to Sunny Duck Bath Squirter ($9.00) … Shape Sorter Cube ($32.00); URL becomes `/?sort=price-asc`; no page reload (Network tab: no document request). Click **High to low**: exact reverse, `/?sort=price-desc`. Click **High to low** again: nothing changes.
3. Reload `/?sort=price-desc`: the page arrives already sorted (no reorder flash). `view-source:` → the card names appear in descending price order.
4. Sign in (any name), open `/?sort=price-asc`: 12 cards, member prices, Set B mixed in: … Shape Sorter Cube ($25.60), Sensory Crinkle Book Set ($28.80), Heirloom Wooden Xylophone ($43.20), Moonbeam Musical Mobile ($54.40), Forest Friends Activity Cube ($71.20).
5. On `/?sort=price-asc`, click the **Plush** chip, search "duck", toggle **Specs first**: each URL keeps `sort=price-asc`. **Clear filters** → `/`, name order.
6. Known limitation (accepted, D-038): on `/`, click **Low to high**, then a chip → the sort is gone (server links carry the old URL).
7. **Layout notes from the review, please look:**
   - Window width 768–900 px: the Price and Layout controls wrap below the search, right-aligned. OK?
   - Do "Low to high" / "High to low" fit inside their pills (no text touching the edge)?
   - Below 768 px the card shows search, chips, Price, Layout, but Tab order is search → Price → Layout → chips (CSS `order`). Acceptable, or a follow-up?
8. Optional: `scripts/verify-ssr.sh` → `744 passed, 0 failed`; `npm run test:e2e` → `65 passed`.

## Result

`/ship` asks for the result in the same thread, right after this file is written (D-035): passed, failed (what you saw), or fixed by you (commit it with `Agent: manual` first). If the thread was stopped, run `/ship` with no argument to resume here.
