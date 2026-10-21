# Phase 07: Build (ui, round 2)

## Changes

Cumulative for the phase. Rows marked **(r2)** changed this round.

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/components/skeletons.tsx` | created (r1), reworked **(r2)**: the five skeletons, no props, no text. Each root has `aria-busy="true"` and its `data-skeleton`, and every element inside is `aria-hidden="true"`. No links, buttons, forms, images, headings or `data-layout`. **(r2):** every box that decides a size now uses the same `ui-classes.ts` constant as the real component (list under Fixes, R8(b)). Non-pill blocks (text, prices, images, inputs) are `rounded-md`; pills are `rounded-full`. `ProductDetailSkeleton`'s price card includes the fixed `DETAIL_PRICE_FOOTER` row. Detail copy stand-ins follow typical mock-data copy (see Open issues) | R2, R3, R8 |
| `src/components/ui-classes.ts` | edited (r1, **r2**): size constants shared by each component and its skeleton. r1: `HEADER_SESSION_SLOT`, `BANNER_FRAME`, `BANNER_INNER`, `FILTER_CARD_FRAME`, `PRODUCT_GRID_COLUMNS`, `DETAIL_BODY`, `LOGIN_CARD_FRAME`, `LOGIN_NOTE`. **(r2):** `CONTROL_HEIGHT` (now inside `BUTTON_PRIMARY` / `BUTTON_SECONDARY` / `CATEGORY_CHIP` / `LAYOUT_OPTION` / `INPUT`), catalog (`CATALOG_STACK`, `FILTER_TOP_ROW`, `FILTER_SEARCH_COLUMN`, `FILTER_SEARCH_ROW`, `SEARCH_INPUT_SIZE`, `FILTER_LAYOUT_COLUMN`, `LAYOUT_TRACK`, `LAYOUT_OPTION`, `CHIP_ROW`, `CATEGORY_CHIP`, `FILTER_FOOTER_ROW`, `COUNT_TEXT`, `PRODUCT_CARD_FRAME`, `PRODUCT_CARD_IMAGE_BOX`, `PRODUCT_CARD_BODY`, `PRODUCT_CARD_ICON`, `PRODUCT_NAME_TEXT`, `CARD_META_TEXT`, `IMAGE_BOX`, `PRICE_STACK`, `PRICE_AMOUNT_TEXT`), detail (`BREADCRUMB_TEXT`, `DETAIL_GRID`, `DETAIL_IMAGE_COLUMN`, `DETAIL_IMAGE_SIZE`, `DETAIL_INFO_COLUMN`, `DETAIL_CATEGORY_ROW`, `ICON_CIRCLE`, `DETAIL_TITLE_TEXT`, `DETAIL_PRICE_CARD`, `DETAIL_PRICE_FOOTER`, `DETAIL_PRICE_FOOTER_STACK`, `SECTION_HEADING`, `DETAIL_SPECS`, `FEATURE_LIST`, `FEATURE_ITEM`, `FEATURE_ICON`) and login (`LOGIN_TITLE_TEXT`, `LOGIN_INTRO`, `LOGIN_FORM`, `FORM_FIELD`, `INPUT`). Each constant holds the same classes the component used before, so the rendered classes don't change (except the detail price row, below) | R8 |
| `src/app/products/[slug]/page.tsx` | edited (r1, **r2**): r1 moved the body into `<Suspense fallback={<ProductDetailSkeleton />}>`. **(r2):** the price card's row under the price is now `DETAIL_PRICE_FOOTER`, a fixed 80 px content box under a 2 px rule (`box-content h-20`). Logged out it holds the prompt and the "Sign in for member pricing" button, stacked (`DETAIL_PRICE_FOOTER_STACK`). Members get the same box, empty, `aria-hidden`, with a transparent rule. Everything else uses the shared constants, with the same classes as before | R6, R8 |
| `src/components/filter-card.tsx` | edited (r1, **r2**): classes come from the shared constants, with the same classes as before. The local `CHIP` constant moved to `ui-classes.ts` as `CATEGORY_CHIP` | R8 |
| `src/components/product-card.tsx` | edited **(r2)**: frame, image box, body, icon circle, name and meta-line classes come from the shared constants, with the same classes as before | R8 |
| `src/components/price.tsx` | edited **(r2)**: `PRICE_STACK`, `PRICE_AMOUNT_TEXT`, with the same classes as before | R8 |
| `src/components/product-image-frame.tsx` | edited **(r2)**: `IMAGE_BOX` (`aspect-square w-full`) in both branches | R8 |
| `src/components/client/layout-toggle.tsx` | edited **(r2)**: the option link class now comes from `LAYOUT_OPTION` in `ui-classes.ts` (same classes). No prop change to `LayoutProvider` / `LayoutGrid` / `LayoutToggle`. No `src/lib/**` import (R14 allows `client/` under this condition) | R8, R9 |
| `src/app/page.tsx` | edited (r1, **r2**): r1 added the banner and catalog boundaries. **(r2):** the container stack is `CATALOG_STACK` (same classes), shared with the `CatalogSkeleton` root | R5, R8 |
| `src/app/login/page.tsx` | edited (r1, **r2**): r1 added the card boundary. **(r2):** title, intro, form, field and input classes come from the shared constants (same classes). The local `INPUT` moved to `ui-classes.ts` | R7, R8 |
| `src/components/site-header.tsx` | edited (r1): the session controls sit inside the `HeaderSessionSkeleton` boundary, and both states fill `HEADER_SESSION_SLOT`. Unchanged this round | R4, R8 |
| `src/components/banner.tsx` | edited (r1): `BANNER_FRAME` / `BANNER_INNER`. Unchanged this round | R5, R8 |
| `src/app/globals.css` | edited (r1): `skeleton-pulse` keyframes and class, off under `prefers-reduced-motion: reduce`. Unchanged this round | R3 |

No change to `src/lib/**`, `src/proxy.ts`, `next.config.ts`, `package.json`, tests or `scripts/` (R14).

## Fixes this round

From `review.md` Round 1:

- **R3 (radii).** The card image, search input, detail image and login input blocks are now `rounded-md` (`BLOCK` in `skeletons.tsx`). Pills (buttons, chips, layout options, icon circles) stay `rounded-full`. No skeleton block uses `rounded-lg` or the blob radius. Radius doesn't change box size, so the measurements below still hold.
- **R8(a): logged-in detail price card.** The price card's height no longer depends on the session. The row under the price is `DETAIL_PRICE_FOOTER` (`mt-3 box-content h-20 border-t-2 pt-3`) in all three places: logged out (text line, then button), members (the same box, empty, transparent rule), and `ProductDetailSkeleton` (the same box with a line bar and a pill). Measured price card: 193.2 px in the skeleton, logged out and logged in, at 320, 375, 414, 640, 768, 1024, 1280 and 1536 px. The detail body (`[data-skeleton=product-detail]` vs the real body root) is the same height and position in both states at 1280x720 and 375x812 (1247.3 px at 375, 870.2 px at 1280).
- **R8(b): catalog and detail skeleton sizes, shown in the diff.** Following the orchestrator's note, every box that decides a size in the skeletons is now a constant shared with the real component:
  - Catalog: `CatalogSkeleton` root uses `CATALOG_STACK`, the same as the page container that holds `FilterCard` + `LayoutGrid`. `LayoutProvider` renders no DOM element (`client/layout-toggle.tsx`, "Renders no DOM element of its own"). `LayoutGrid` is a plain block `div`, so it adds no size.
  - Filter card: inside `FILTER_CARD_FRAME` it uses `FILTER_TOP_ROW` > `FILTER_SEARCH_COLUMN` (`LABEL` line, `FILTER_SEARCH_ROW` with `SEARCH_INPUT_SIZE` and a `CONTROL_HEIGHT` pill) and `FILTER_LAYOUT_COLUMN` (`LABEL` line, `LAYOUT_TRACK` holding two `CONTROL_HEIGHT` pills, the same as the real two `LAYOUT_OPTION` links). Then `CHIP_ROW` holds seven `CONTROL_HEIGHT` pills (`CATEGORY_CHIP` uses `CONTROL_HEIGHT`), and `FILTER_FOOTER_ROW` holds a `COUNT_TEXT` line and a `CONTROL_HEIGHT` pill.
  - Product card: `PRODUCT_CARD_FRAME` > `PRODUCT_CARD_IMAGE_BOX` (`IMAGE_BOX`), then `PRODUCT_CARD_BODY` (`PRODUCT_CARD_ICON`, `PRICE_STACK` with `LABEL` and `PRICE_AMOUNT_TEXT` lines, a `PRODUCT_NAME_TEXT` line, `CARD_META_TEXT` lines), in `PRODUCT_GRID_COLUMNS`.
  - Detail: `DETAIL_BODY` holds a `BREADCRUMB_TEXT` line and `DETAIL_GRID`. `DETAIL_IMAGE_COLUMN` holds `IMAGE_BOX` + `DETAIL_IMAGE_SIZE`. `DETAIL_INFO_COLUMN` holds `DETAIL_CATEGORY_ROW` (`ICON_CIRCLE`, `LABEL`), a `DETAIL_TITLE_TEXT` line, description lines, `DETAIL_PRICE_CARD` (`PRICE_STACK`, `DETAIL_PRICE_FOOTER`), `SECTION_HEADING` + `DETAIL_SPECS`, and `SECTION_HEADING` + `FEATURE_LIST` / `FEATURE_ITEM` / `FEATURE_ICON`.
  - Login: `LOGIN_CARD_FRAME` holds `LOGIN_TITLE_TEXT`, `LOGIN_INTRO`, `LOGIN_NOTE`, then `LOGIN_FORM` > `FORM_FIELD` (`LABEL` line, `CONTROL_HEIGHT` block) and a `CONTROL_HEIGHT` pill.
  - Every text stand-in is `Line`: a wrapper that takes the real text's typography classes and is `h-lh` (one line box) tall.
  - Measured too (scratch Playwright script, reduced motion; skeleton with JS off, so the fallback stays, and content with JS on, comparing `getBoundingClientRect` top and height). At 1280x720 and 375x812, both states, these all match within 0.5 px: header; banner; filter card (293.2 px at 1280, 600.4 px at 375); chip block; first grid card at 375 (both states) and at 1280 (logged out); grid top; detail body, image, info column and price card; login card. The remaining differences depend on the data, not on the skeleton: see Open issues.
  - Also fixed while measuring: at 320 px the detail skeleton's 256 px sign-in pill made the single grid column 4 px wider than the container (min-content). It is now `w-56`, and the detail image and info column widths match at 320.

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`, tsc clean |
| `npm run lint` | PASS | eslint, no output |
| `npm test` | PASS | `Test Files 15 passed (15)`, `Tests 390 passed (390)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | `◐ /`, `◐ /login`, `◐ /products/[slug]` (Partial Prerender), `○ /_not-found` |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 474 passed, 0 failed`, `verify-ssr: PASS` |
| `npm run test:e2e` | PASS | `25 passed (7.6s)` (12 x R10 layout-shift, layout-toggle, not-found, login) |
| `grep -rn "export const instant" src ; find src/app -name 'loading.tsx'` | PASS | both empty |

Extra measurement (scratch only): logged-in header slot below `md`, with a 43-character name. The badge + "Signed in as" column is 47.2 px tall inside the 48 px `HEADER_SESSION_SLOT` at 320, 375 and 767 px, so it doesn't overflow onto the banner (reviewer's note).

## Open issues

- **Visible change on the detail page (needs reviewer / human sign-off; spec Out of scope says "Changing ... layout").**
  - Logged out: the prompt and the "Sign in for member pricing" button are always stacked. Before, they sat side by side when the card was wide enough (about the `md` range). At 375 and 1280 they already wrapped, so those widths look the same as before.
  - Members: the price card has an empty 80 px area (plus the 12 px gap and padding) under the price, where the sign-in row is for visitors.
  - This is the smallest change that gives R8(a) "the price card's height must not depend on state". The alternative the reviewer offered is that the human accepts the logged-in height difference instead. If so, revert `DETAIL_PRICE_FOOTER` for members and drop the row from the skeleton.
- **Sizes that depend on the data and still differ (no skeleton without props can follow them):**
  - **Grid length.** 8 cards logged out, 12 logged in, 2 for `/?category=bath`. Only the footer is below it, offscreen at both tested viewports.
  - **Grid row height.** Rows stretch to their tallest card. Logged in at `lg` and up, the first row has a card whose name wraps beside the "Members only" badge (521.9 px vs the skeleton's 461.9 px at 1280). Elsewhere, the age · material line wraps for some products (for example at 640 and 1024 px, and in the 4th and 5th cards at 375). The placeholder card adds a second meta line from `xl`, where almost every logged-out card wraps it. So the skeleton's first row equals the real logged-out first row at 1280 and 1536, and every card at 375.
  - **Detail copy.** The stand-ins follow typical mock-data copy: a one-line name, a ~130-character description (4 lines below `sm`, 2 from `sm`, 3 in the `lg` column), and 4 features (7 of 12 products have 4; 5 have 3). For `cloud-bunny-plush` this matches exactly at 375 and 1280. At 320 the description takes 5 lines (+20 px), at 414 it takes 3 (-24 px), and at 1024 the name wraps (+61 px). Those differences move the price card and what follows inside the swapped body, not the header.
  - **`/?layout=specs`.** The catalog skeleton is always price-first. The layout comes from `searchParams`, and skeletons take no props, so the specs layout's cards differ from the placeholders.
  - **`/login?error=missing`.** The card is 64 px taller (alert); unchanged from round 1.
- **Hard-coded skeleton widths.** `CHIP_WIDTHS` (unchanged from round 1) must be measured again if a chip label, the chip padding or the font changes. Widths don't change heights anywhere else.
- **Unknown slug status** (unchanged from round 1, reviewer's note). `notFound()` runs inside the boundary, so `/products/no-such-toy` answers 200 with `noindex` and renders the not-found screen. The bundled `not-found.md` / `streaming.md` describe this. Spec Out of scope accepts it ("still JS-handled"). verify-ssr has no 404 status assertion that fails (474/474), and `e2e/not-found.spec.ts` passes.
- Carried from round 1 and not raised again by the reviewer: the header layout change below `md` (session controls on their own 48 px row) and the reserved banner / login-note min heights. Both still need human sign-off as described in round 1.

## Where the instructions got in the way

- **R8 "same outer size" vs data-dependent content.** As the reviewer noted, a skeleton without props can't follow the grid's card count, row heights that depend on the copy, or the detail page's copy length. I shared every frame, gap, padding, control height and line height through constants. I tuned only the copy-length stand-ins to typical mock data, and listed the remaining differences above.
- **R8(a) vs "Out of scope: changing layout".** A state-independent price card height requires reserving the sign-in row's space for members. That is a visible change; flagged above for sign-off.
- **R3 `rounded-md` for images and inputs** follows the spec and design.md as written; it doesn't affect size, so it no longer conflicts with R8.
