# Phase 10: Human check

**Status:** closed (commit: see `git log -1` on `feature/member-savings`, `feat(ui): phase 10 - savings line`)
**Result:** PASSED (2026-10-22)

## Escalation

none

## Verify it yourself (about 10 minutes)

Run from the repo root, on the feature branch (`git switch feature/member-savings`).

1. `npm run dev`, open `http://localhost:3000/`. Signed out, expect: every card shows "EVERYDAY PRICE" and the amount, a small empty gap under the amount, and no "You save" anywhere.
2. Click **Sign in**, enter any name and password. Back on `/`, expect: all 12 cards show "MEMBER PRICE", the amount, and directly under it a mint pill with a dark border reading **You save 20%**, left-aligned.
3. Switch the layout to **Specs first**. Expect: the pill sits under the amount, right-aligned with it. The cards don't jump while the page loads.
4. Open **Cloud Bunny Plush**. Expect: "$22.40", then **You save 20%** under it, then the "Member price applied" note. Sign out, open the same product again: "$28.00", an empty row where the pill was, then "Sign in for member pricing". The price card is the same height in both states.
5. Narrow the window to about 375 px wide (or use device mode) and repeat steps 2 and 4. Expect: the pill never wraps and never overlaps the amount.
6. View source while signed out (`view-source:http://localhost:3000/`), search for `You save`. Expect: no match. Signed in, the same search finds `You save 20%`.

## Result

`/ship` asks for the result in the same thread, right after this file is written (D-035): passed, failed (what you saw), or fixed by you (commit it with `Agent: manual` first). If the thread was stopped, run `/ship` with no argument to resume here.
