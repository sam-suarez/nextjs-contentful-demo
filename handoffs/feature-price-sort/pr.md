## Price sort

Visitors can sort the catalog by price, "Low to high" or "High to low", from a new **Price** control beside Layout. The server renders the grid already sorted for `?sort=price-asc|price-desc`, so links and no-JS visits work. With JS, a click reorders the cards in place with no request, and the island never receives a price. Signed-in members sort by the member price they see, with members-only toys mixed in.

### Decisions (D-038)

The human's answers from the interview, recorded in `handoffs/feature-price-sort/intake.md` and written into the docs in the `docs(arch)` commit (9d7708e).

- I1: Client reorder with no refetch. The server sorts by `?sort`, and the island gets only integer index orders per option plus the server-rendered cards: no prices, slugs or Set B data.
- I2: Two options, price ascending and descending. None is active by default; with no `sort`, the grid stays in name order.
- I3: The order uses the price the visitor sees (everyday signed out, member signed in), with ties broken by name A–Z.
- I4: The control is the existing Segmented control: real links, `aria-current` without JS and `aria-pressed` with it.
- I5: Copy: label "Price", options "Low to high" / "High to low".
- I6: Clicking the active option does nothing. Clear filters is the way back to name order.
- I7: The URL values are `sort=price-asc|price-desc`. Search, chips and layout links keep `sort`, Clear filters drops it, and unknown values are ignored.
- I8: The control sits beside Layout, to its left from `md` up. Below `md` the card stacks search, chips, Price, Layout, then count and Clear. The skeleton reserves its space (CLS < 0.01).
- I9: Known limitation, accepted and shared with the layout toggle: after a client-side sort or layout toggle, the server-rendered links carry the URL from the last server render.
- Amendment A1 (phase 12, OI-3): there is no test for the Layout toggle after a client-side sort, because it would contradict I9.

### Phases

| Phase | Builder | Commit | qa post-build | Human check |
|-------|---------|--------|---------------|-------------|
| 11 price sort helper | data-auth | `7f83272` | PASS (unit 496, verify-ssr 514, e2e 43) | passed |
| 12 price sort control | ui | `461cd9c` | PASS (unit 515, verify-ssr 744, e2e 65) | passed |

### Already live

none (no Contentful, schema or mock changes)

### How to verify

Each phase's `handoffs/phase-NN/human-check.md` lists the 10-minute check (`handoffs/phase-11/human-check.md`, `handoffs/phase-12/human-check.md`). After merging, the next `/ship` records the merge in `handoffs/STATE.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
