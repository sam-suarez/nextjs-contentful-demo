# Feature member-savings: Architect (round 1)

## Changes

| File | Section | Change | Intake item(s) |
|------|---------|--------|----------------|
| `docs/architecture.md` | Server/client boundary | added: D-036 to the heading | I2 |
| `docs/architecture.md` | Server/client boundary | added: bullet, the savings line (`You save <n>%`, from `savingsPercent`) is price data, server components only, never an island prop, never in a skeleton (skeletons reserve its empty row) | I2, I7 |
| `docs/architecture.md` | Server/client boundary | replaced: islands never receive prices "(including `savingsPercent`)" | I2 |
| `docs/architecture.md` | Data access | added: D-036 to the heading; DAL sub-bullet, `getProducts()` / `getProductBySlug()` return `CatalogProduct` with price, tier and `savingsPercent: number \| null` resolved by the DAL | I2 |
| `docs/architecture.md` | Data access | added: `savingsPercent` bullet with the `Math.round` formula, the three `null` cases, and "pages/components only render it, never receive the everyday price for a member-tier product; logged-out render holds nothing derived from member prices" | I2, I3 |
| `docs/architecture.md` | Tests | added: D-036 to the heading; SSR checks assert `You save 20%` present with a session, absent without one | I2, I4 |
| `docs/design.md` | Components: Badge | added: "You save <n>%" pill variant, `bg-quaternary` (mint), `foreground` text (existing Badge: 2 px `foreground` border, 12.8 px 700, pill) | I6 |
| `docs/design.md` | Components: Price | added: Savings row, own line under the amount, fixed height from one shared `ui-classes.ts` constant used by Price and its skeleton; `You save <n>%` as one text node for member tier with a saving; reserved empty row for everyday tier / `null` / signed out; Price never computes it | I1, I4, I5, I7 |
| `docs/design.md` | Components: Skeleton | added: skeleton price blocks reserve the same savings row via the same constant | I7 |
| `docs/design.md` | Screens: Catalog (wireframe) | added: reserved empty row under the Price first amounts, a signed-in Price first price block with `[You save 20%]`, and the pill right-aligned under `MEMBER PRICE ... $71.20` in Specs first | I1, I5, I7, I8 |
| `docs/design.md` | Screens: Catalog (Card content) | added: price block lists the savings row (Price first); pill on its own line under the amount, right-aligned (Specs first) | I1, I5, I8 |
| `docs/design.md` | Screens: Product detail | added: reserved savings row in the price card wireframe; Logged in shows the pill under the amount, row reserved empty when logged out so the card is the same size | I1, I5, I7 |
| `docs/decisions.md` | table | added: row D-036 (Part 6, 2026-10-22); superseded rows: none | I1-I9 |
| `.claude/rules/ssr-rendering.md` | rules | replaced: two bullets name `savingsPercent` / `You save <n>%` alongside prices (server components, never a fallback or island); `paths:` unchanged | I2 |
| `.claude/rules/client-islands.md` | rules | replaced: "Never pass prices (including `savingsPercent`, D-036), ..."; `paths:` unchanged | I2 |

## Contentful

Changes made in the live space (live before merge). "none" when the intake lists none.

none

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm test` | PASS | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run snapshot:contentful` | not run | |

## Open issues

none

## Where the instructions got in the way

- The intake's Changes column for I2 says "DAL resolves the price, tier and saving", but architecture.md never described the DAL resolving price and tier before. I wrote one sub-bullet that names all three as the DAL's output, which describes existing behaviour rather than adding a new rule. The reviewer may want to confirm this wording.
- I9 changes no file ("none (Out of scope)"). It appears only in D-036 ("No signed-out teaser") and in the existing "logged-out render holds nothing derived from member prices" wording.
