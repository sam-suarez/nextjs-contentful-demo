# Feature price-sort: Architect (round 1)

## Changes

| File | Section | Change | Intake item(s) |
|------|---------|--------|----------------|
| `docs/architecture.md` | Routes (heading + D-038) | replaced: `/` row now "sorted by name, or by the price the visitor sees when `sort` is set (equal prices by name)" | I2, I3 |
| `docs/architecture.md` | Server/client boundary (heading + D-038) | added: sort island receives only the current sort, per-option index orders (numbers computed on the server) and server-rendered cards as `children`; never prices, slugs or Set B data | I1 |
| `docs/architecture.md` | Data access (heading + D-038) | added: price sort helper in `src/lib/products/` (pure, server-only; visitor's resolved price, Set B included, name A–Z ties; no `sort` = input order; no mutation; index orders; signed-out order uses nothing from member prices; pages never compare prices) | I1, I3 |
| `docs/architecture.md` | Filtering and layout (heading + D-038) | replaced: params list adds `sort` (`price-asc` \| `price-desc`); validation (unknown ignored, absent = name order); filter then sort | I2, I7 |
| `docs/architecture.md` | Filtering and layout | replaced: search hidden inputs and chips keep `sort`; Clear Filters drops it; layout links keep `q`, `category`, `sort` | I7 |
| `docs/architecture.md` | Filtering and layout | added: Sort control bullet (two options, none active by default, real links keeping `q`/`category`/`layout`, DOM reorder, `replaceState`, no request, active click does nothing, Clear is the way back) | I1, I2, I6, I7 |
| `docs/architecture.md` | Filtering and layout | added: known stale-link limitation shared with the layout toggle, not fixed | I9 |
| `docs/architecture.md` | Tests (heading + D-038) | added: SSR checks for both sorts signed out and signed in plus unknown `sort`; e2e sort click with no navigation and URL update; CLS check covers a sorted URL | I1, I3, I8 |
| `docs/design.md` | Components, Segmented control | replaced: row covers layout and price sort; label "Price", options "Low to high" (`sort=price-asc`) / "High to low" (`sort=price-desc`), none active by default; `aria-pressed` / `aria-current` | I2, I4, I5 |
| `docs/design.md` | Components, Skeleton | added: catalog filter card skeleton reserves the Price control beside Layout (CLS < 0.01) | I8 |
| `docs/design.md` | Screens, Catalog | replaced: heading notes phase 12; wireframe shows PRICE `[Low to high\|High to low]` left of LAYOUT | I5, I8 |
| `docs/design.md` | Screens, Catalog, Products | replaced: name order unless a price sort is active, then the visitor's price, Set B in the same order, ties by name | I2, I3 |
| `docs/design.md` | Filtering and layout controls | replaced: Search hidden inputs and Category chips also keep `sort`; Clear filters drops it | I7 |
| `docs/design.md` | Filtering and layout controls | added: layout links keep `sort`; Sort control bullet (placement, links, island behaviour, `aria-current` / `aria-pressed`, active click does nothing) | I1, I4, I6, I7, I8 |
| `docs/design.md` | Responsive | replaced: filter card stacking below `md`: search, chips, Price, Layout, then count and Clear filters | I8 |
| `docs/design.md` | Who builds what | added: rows 11 (helper, no UI) and 12 (price sort control) | Build phases |
| `docs/decisions.md` | table | added: row D-038 (Part 6, 2026-10-23); amends D-019's URL param list; no row superseded | I1–I9 |
| `.claude/rules/client-islands.md` | bullets | replaced: props example adds current sort with per-option index orders (numbers, D-038); URL state list adds `sort` | I1, I7 |

## Contentful

| Action | Target | Result |
|--------|--------|--------|
| none | | |

## Fixes this round

none

## Check output

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm test` | PASS (17 files, 458 tests) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run snapshot:contentful` | not run | |

## Open issues

none

## Where the instructions got in the way

- The design.md "Who builds what" table stopped at P05 (phases 06–10 have no rows), so the new rows 11 and 12 come straight after P05. I didn't backfill the gap because the intake doesn't ask for it.
- The intake's I1 lists no alternative to "client reorder, no refetch", so D-038's "Options considered" says that was the only option put to the human for that question.
