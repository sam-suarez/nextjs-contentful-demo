# Feature member-savings: Docs review

Reviewer inputs: `intake.md` + `docs.patch` only (docs mode). Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| I1 | PASS | docs/design.md:103 adds the savings row to Price. design.md:175-176 covers both card variants (Price first and Specs first) and design.md:214 covers the detail price card when logged in. | |
| I2 | PASS | docs/architecture.md:51-55 says the DAL resolves `savingsPercent: number \| null` on `CatalogProduct`, that pages and components only render it and never get the everyday price for a member-tier product, and that the logged-out render holds nothing derived from member prices. architecture.md:36 and :38 treat it as price data that never reaches an island or a skeleton. The rules match (.claude/rules/ssr-rendering.md:12,14 and client-islands.md:11). design.md:103 says "Price only renders the value from the DAL". | |
| I3 | PASS | docs/architecture.md:53-54 gives the exact formula, the whole number, and all three `null` cases: everyday tier, a rounded value of 0 or less, and an everyday price of 0. | |
| I4 | PASS | docs/design.md:103 has the template `You save <n>%` and the example `You save 20%` as one text node. No other wording was added anywhere in the diff. | |
| I5 | PASS | docs/design.md:103 says "its own line directly under the amount (not on the amount row)". The wireframes at design.md:156-159 and :169 agree. | |
| I6 | PASS | docs/design.md:100 adds a Badge variant. It inherits the pill, 2 px `foreground` border and 12.8 px 700, and adds `bg-quaternary` (mint) with `foreground` text. | |
| I7 | PASS | docs/design.md:103 reserves a fixed-height row in every state, set by one shared `ui-classes.ts` constant, and leaves it empty for the everyday tier or `null`, including signed-out blocks. design.md:110 gives skeleton price blocks the same constant, and design.md:150, :195 and :214 show the reserved row. The CLS test line (architecture.md:92) is unchanged. | |
| I8 | PASS | docs/design.md:176 says "on its own line under the amount, right-aligned (D-036)", and the wireframe at design.md:169 shows the pill right-aligned under `$71.20`. | |
| I9 | PASS | The diff adds no teaser. The logged-out banner and price copy are unchanged, and docs/architecture.md:55 keeps the logged-out render free of anything derived from member prices. | |
| DG1 | PASS | The patch touches only .claude/rules/client-islands.md, .claude/rules/ssr-rendering.md, docs/architecture.md, docs/decisions.md and docs/design.md. | |
| DG2 | PASS | Every hunk traces to an intake item: rules and architecture boundary to I2; data access to I2 and I3; tests to I2 and I4; Badge to I6; Price and Skeleton to I4, I5 and I7; wireframes and card content to I1, I5, I7 and I8; detail page to I1, I5 and I7. There are no new routes, dependencies, data shapes or strings beyond the intake. | |
| DG3 | PASS | The hard rules are untouched. The new lines only extend them to `savingsPercent` and cite D-036 (architecture.md:36, :38, :51-55; ssr-rendering.md:12,14; client-islands.md:11). | |
| DG4 | PASS | docs/decisions.md gains a D-036 row (patch line 88) with the table's 7 columns (ID, Part, Decision, Options considered, Chosen, Why, Date). It lists the options the intake recorded and the human's choices, including the I5 choice that went against the recommendation. No row was superseded or rewritten. | |
| DG5 | PASS | `You save 20%` appears verbatim in docs/design.md at lines 103, 159, 169 and 214, and the template `You save <n>%` at line 103. The "no text, reserved row empty" case is at design.md:103. | |
| DG6 | PASS | No change to schemas, `src/schemas/**` or `src/data/**`, which matches the intake's "Data changes: none". | |
| DG7 | PASS | No old rule sits next to its replacement. The skeleton "contain no text" rule (design.md:110) agrees with architecture.md:36 ("never in a skeleton … only reserve its empty row"). The detail card stays the same size in both states (design.md:214). | |

Overall: PASS

Notes:
- docs/design.md:29: the `quaternary` token's Use column still says "Mint: feature check circles" only. The savings pill is now a second use. The column has never been exhaustive, so this is not a contradiction, but adding "savings pill" would keep it accurate.
- docs/architecture.md:89: `(D-036)` now sits mid-sentence after "absent without one", so the whole Set B / member-price clause reads as if it comes from D-036 rather than D-031. Moving the citation next to "the savings line `You save 20%`" would fix the attribution.
- docs/design.md:103 and :110 name `ui-classes.ts` without a directory. The intake does the same, so the ui builder will have to find the existing file.
- docs/design.md "Who builds what" (lines 280-286) still lists only P03-P05. The intake didn't ask for an update.

Where the instructions got in the way: DG4 asks for "the options considered", but the intake lists alternatives only for I5 (same row vs own line) and I9 (teaser vs none). The other items are marked "recommended: yes" without naming the rejected options, so the D-036 row can't list more than it does. I judged it against what the intake records.

**Orchestrator decision:** all PASS → Confirm 2 (A6)
