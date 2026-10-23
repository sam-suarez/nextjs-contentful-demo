# Feature price-sort: Docs review

Reviewer inputs: `intake.md` + `docs.patch` only (docs mode). Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| I1 | PASS | docs/architecture.md:39 says the island gets only the current sort plus a list of card indices per option, computed on the server, plus `children`, and never prices, slugs or Set B data. docs/architecture.md:57-61 adds the pure server-only helper in `src/lib/products/`, :73 covers the real links, DOM reorder, `replaceState` and no request, and docs/design.md:267-268 matches. | |
| I2 | PASS | docs/architecture.md:73 and docs/design.md:107,266 give two options with none active by default. docs/architecture.md:70 says no `sort` means name order, and docs/design.md:173 says the Products bullet uses name order unless a price sort is active. | |
| I3 | PASS | docs/architecture.md:58,60 sorts by the price the visitor sees (everyday signed out, DAL-resolved member price signed in, members-only products included), breaks ties by name A–Z, and the signed-out order uses nothing derived from member prices. The Routes row (:13) and docs/design.md:173 agree. | |
| I4 | PASS | docs/design.md:107 puts the sort in the existing Segmented control row with `aria-pressed` (island) or `aria-current` (links). docs/design.md:267-268 repeats this for the sort control: `aria-current` without JS, `aria-pressed` with it. | |
| I5 | PASS | docs/design.md:107 and :266 have label "Price" (uppercase label style) and options "Low to high" (`sort=price-asc`) and "High to low" (`sort=price-desc`). The wireframe shows `PRICE` at docs/design.md:138-139. | |
| I6 | PASS | docs/architecture.md:73 and docs/design.md:269 say clicking the active option does nothing. docs/design.md:261 says Clear filters is the way back. | |
| I7 | PASS | docs/architecture.md:69-73 adds `sort` (`price-asc` / `price-desc`), says unknown values are ignored, the search hidden input, chips and layout links keep it, the sort links keep `q`/`category`/`layout`, and Clear drops it. docs/design.md:259-261,265,267 matches, and .claude/rules/client-islands.md:13 adds `sort` to its list of URL params. | |
| I8 | PASS | docs/design.md:266 places the control beside Layout, to its left from `md` up, and the wireframe at :138-139 shows it. :273 stacks search, chips, Price, Layout, then count and Clear below `md`. :110 has the skeleton reserving the Price control (D-038/D-031), and docs/architecture.md:101 extends the CLS check to a sorted URL. | |
| I9 | PASS | docs/architecture.md:74 records the stale-link limitation in both directions (sort and layout) as not fixed. The D-038 row records it too (docs/decisions.md, new row). | |
| DG1 | PASS | docs.patch touches only `.claude/rules/client-islands.md`, `docs/architecture.md`, `docs/decisions.md` and `docs/design.md`. | |
| DG2 | PASS | Every hunk traces to I1–I9 or the intake's "Doc changes" list, including Routes, Tests and the Who-builds-what rows 11/12 (docs/design.md:292-293). Changing the rule file is allowed because client-islands.md:13 lists the URL params, and the :11 prop-example edit traces to I1. | |
| DG3 | PASS | Prices and session content still render on the server (docs/architecture.md:35, unchanged). The one boundary change, index orders passed to an island, cites D-038 at docs/architecture.md:39. `server-only` for the helper is at :57, and the `'use client'`, DAL and `NEXT_PUBLIC_` rules are untouched. | |
| DG4 | PASS | The D-038 row uses the table's 7 columns (ID, Part, Decision, Options considered, Chosen, Why, Date), with `\|` escaped. It lists the options (recommended vs chosen for I2, I6 and I9), the human's choice, the reason, the date 2026-10-23, and "amends D-019's list of URL params". No row was rewritten or deleted. | |
| DG5 | PASS | `Price`, `Low to high` and `High to low` appear verbatim at docs/design.md:107 and :266. | |
| DG6 | PASS | The intake has no schema or mock changes, and the patch has none. | |
| DG7 | PASS | No old rule sits next to its replacement. The Filtering bullets (docs/architecture.md:69-74) match docs/design.md:259-273, and :39 is a narrow, cited addition to the general rule at :38. | |

Overall: PASS

Notes:
- docs/architecture.md:38 still says islands "never receive ... session data" with no exception. When signed in, the index orders depend on member prices, so they come from the session. Line 39 allows this narrowly and cites D-038, so I count it as consistent. A phrase like "except the sort island's index orders (D-038)" on line 38 would remove any doubt for the phase-12 builder and reviewer.
- The Routes row (docs/architecture.md:13) says "by the price ... when `sort` is set". An unknown `sort` value is "set" but gives name order. Line 70 clarifies this, so the row is only imprecise; "a valid `sort`" would be exact. The same row still reads "Filters + layout toggle", which leaves out the sort control.
- docs/design.md:263 (the P03 layout-links bullet, "keeping `q` and `category`") is history and stays correct because the new :265 bullet adds `sort`. I see no conflict, but a reader skimming the list might miss :265.
- The wireframe rows at docs/design.md:138-139 run past the card's right border. This is cosmetic only; the old Layout row already did the same.
- For phase 12, not this diff: "reorders the real DOM children" could be built by moving React-owned nodes by hand, which can break React's reconciliation on a later update or soft navigation. Reordering the `children` array through React state would satisfy the doc text just as well. This is worth calling out in the phase-12 spec.

Where the instructions got in the way: G6 in agents/reviewer.md says "No client island receives ... session data as props". Read literally, that could flag the signed-in index orders in phase 12, even though D-038 explicitly allows them. The architect can't edit agent definitions, so the orchestrator or the human may want to make G6 name the D-038 exception, or put it in the phase-12 spec, before that review.

**Orchestrator decision:** all PASS → Confirm 2 (A6)
