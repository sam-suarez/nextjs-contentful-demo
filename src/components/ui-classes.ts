// Shared Tailwind class strings. Literal strings only, so Tailwind's scanner sees every class.
import type { CategoryColor } from "@/components/categories";

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 md:px-6";

export const LABEL = "text-label font-bold uppercase tracking-wide";

/** Height of every 48 px control (buttons, chips, inputs, layout options) and its skeleton block. */
export const CONTROL_HEIGHT = "min-h-12";

export const BUTTON_PRIMARY = `btn-pop inline-flex ${CONTROL_HEIGHT} items-center justify-center gap-2 rounded-full border-2 border-foreground bg-accent-strong px-6 font-bold text-white`;

export const BUTTON_SECONDARY = `inline-flex ${CONTROL_HEIGHT} items-center justify-center gap-2 rounded-full border-2 border-foreground bg-transparent px-6 font-bold text-foreground transition-colors hover:bg-tertiary`;

export const TEXT_LINK = "font-bold text-accent-strong underline decoration-2 underline-offset-2";

export const CARD_BASE = "rounded-xl border-2 border-foreground bg-card";

// Sizes shared by a component and its Suspense skeleton (src/components/skeletons.tsx), so both
// have the same outer size at every breakpoint and the swap shifts nothing (D-031). Each
// constant holds the classes that decide a box's size (display, gaps, padding, borders, min and
// fixed heights, typography that sets the line height); colours stay in the components.

/**
 * Session part of the site header: one 48 px row beside the logo at every width, right-aligned.
 * Fixed height in both session states, so the header never changes height. Below `md` the
 * logged-in state shows only the member avatar and Sign out, so it fits next to the logo.
 */
export const HEADER_SESSION_SLOT = "flex h-12 min-w-0 items-center justify-end gap-2 md:gap-3";

/** Header buttons: one line, 16 px side padding below `sm`, so they fit beside the logo. */
export const HEADER_BUTTON_COMPACT = "whitespace-nowrap max-sm:px-4";

/** Extras beside a header button (Sign in arrow, member avatar), dropped below 360 px for room. */
export const HEADER_NARROW_HIDDEN = "max-[360px]:hidden";

export const BANNER_FRAME = "border-b-2 border-border bg-card";

/**
 * Banner text box. The min heights reserve the most lines either banner sentence needs
 * (3 lines below 360 px, 2 below `sm`, 1 from `sm`), so both states and the skeleton match.
 */
export const BANNER_INNER = "min-h-21 py-3 text-sm font-medium min-[360px]:min-h-16 sm:min-h-11";

// Catalog (src/app/page.tsx, filter-card.tsx, product-grid.tsx, product-card.tsx, price.tsx).

/** The page container's stack: filter card, then grid or empty state (and the catalog skeleton root). */
export const CATALOG_STACK = "flex flex-col gap-10";

export const FILTER_CARD_FRAME = `${CARD_BASE} sticker flex flex-col gap-5 p-4 md:p-6`;

/** Search form beside the layout control from `md`, stacked below. */
export const FILTER_TOP_ROW = "flex flex-col gap-5 md:flex-row md:items-end md:justify-between";

export const FILTER_SEARCH_COLUMN = "flex flex-1 flex-col gap-2 md:max-w-xl";

/** Search input and Search button: stacked below `sm`, one row from `sm`. */
export const FILTER_SEARCH_ROW = "flex flex-col gap-3 sm:flex-row";

export const SEARCH_INPUT_SIZE = `${CONTROL_HEIGHT} flex-1`;

export const FILTER_LAYOUT_COLUMN = "flex flex-col gap-2";

/** Segmented layout control track (2 px border, 4 px padding around two 48 px options). */
export const LAYOUT_TRACK = "inline-flex w-fit gap-1 rounded-full border-2 p-1";

export const LAYOUT_OPTION = `inline-flex ${CONTROL_HEIGHT} items-center rounded-full border-2 px-4 text-sm font-bold`;

export const CHIP_ROW = "flex flex-wrap gap-2";

export const CATEGORY_CHIP = `inline-flex ${CONTROL_HEIGHT} items-center gap-2 rounded-full border-2 border-foreground px-4 text-sm font-bold`;

/** Count and Clear filters, under a rule. */
export const FILTER_FOOTER_ROW = "flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-4";

export const COUNT_TEXT = "font-heading text-lg font-bold";

export const PRODUCT_GRID_COLUMNS = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Product card frame (price-first layout; the specs layout adds group-data variants). */
export const PRODUCT_CARD_FRAME = `${CARD_BASE} relative flex flex-col`;

export const PRODUCT_CARD_IMAGE_BOX = "p-3";

export const PRODUCT_CARD_BODY = "flex flex-1 flex-col gap-2 px-4 pb-4";

/** The category icon circle that overlaps the image by 20 px. */
export const PRODUCT_CARD_ICON = "-mt-5 h-10 w-10";

export const PRODUCT_NAME_TEXT = "font-heading text-lg leading-snug font-bold";

/** Category line and age · material line under the name. */
export const CARD_META_TEXT = "text-sm";

/** Square image frame (catalog card and detail page). */
export const IMAGE_BOX = "aspect-square w-full";

/** Price: label line over the amount line. */
export const PRICE_STACK = "flex flex-col";

export const PRICE_AMOUNT_TEXT = "font-heading text-2xl font-extrabold tabular-nums";

/**
 * Savings row under the amount (D-036): one fixed 28 px line, always rendered (empty for the
 * everyday tier and in skeletons), so every price block has the same height. The savings pill
 * (12.8 px text, 2 px border, 2 px vertical padding: about 27 px) fits inside it.
 */
export const PRICE_SAVINGS_ROW = "flex h-7 items-center";

// Product detail (src/app/products/[slug]/page.tsx).

export const DETAIL_BODY = `${CONTAINER} flex flex-col gap-6 py-8`;

export const BREADCRUMB_TEXT = "text-sm";

export const DETAIL_GRID = "grid gap-8 lg:grid-cols-12";

export const DETAIL_IMAGE_COLUMN = "lg:col-span-7";

export const DETAIL_IMAGE_SIZE = "mx-auto max-w-md";

export const DETAIL_INFO_COLUMN = "flex flex-col gap-4 lg:col-span-5";

/** Category icon circle and label above the title. */
export const DETAIL_CATEGORY_ROW = "flex items-center gap-2";

export const ICON_CIRCLE = "h-10 w-10";

export const DETAIL_TITLE_TEXT = "font-heading text-title-sm leading-tight font-extrabold md:text-title";

export const DETAIL_PRICE_CARD = `${CARD_BASE} sticker p-4`;

/**
 * Row under the price: a fixed 80 px content box (one text-sm line, 12 px, a 48 px button) under
 * a rule. Logged out it holds the sign-in prompt; for members a "Member price applied" note,
 * centred in the same box, so the price card has the same height in both states and in the skeleton.
 */
export const DETAIL_PRICE_FOOTER = "mt-3 box-content h-20 border-t-2 pt-3";

/** Logged-out content of DETAIL_PRICE_FOOTER: the text line at the top, the button at the bottom. */
export const DETAIL_PRICE_FOOTER_STACK = "flex flex-col items-start justify-between border-border";

/** Member content of DETAIL_PRICE_FOOTER: a check icon and two text lines, vertically centred. */
export const DETAIL_PRICE_FOOTER_MEMBER = "flex items-center gap-3 border-border";

export const SECTION_HEADING = "mb-2 font-heading text-lg font-bold";

export const DETAIL_SPECS = `${CARD_BASE} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm`;

export const FEATURE_LIST = "flex flex-col gap-2 text-sm";

export const FEATURE_ITEM = "flex items-center gap-2";

export const FEATURE_ICON = "h-6 w-6 shrink-0";

// Login (src/app/login/page.tsx).

export const LOGIN_CARD_FRAME = `${CARD_BASE} sticker-member relative w-full max-w-md p-6 md:p-8`;

export const LOGIN_TITLE_TEXT = "font-heading text-2xl font-extrabold";

export const LOGIN_INTRO = "mt-2";

/** Login demo note: two lines until the card is wide enough for one (440 px viewport). */
export const LOGIN_NOTE = "mt-1 min-h-10 text-sm text-muted-foreground min-[440px]:min-h-5";

export const LOGIN_FORM = "mt-6 flex flex-col gap-4";

export const FORM_FIELD = "flex flex-col gap-2";

export const INPUT = `${CONTROL_HEIGHT} rounded-lg border-2 border-input-border bg-input px-4 placeholder:text-muted-foreground focus:border-accent focus:shadow-pop-accent`;

/** Per-colour utilities: fills, dot backdrop tint and the active-chip shadow. */
export const COLOR_CLASSES: Record<
  CategoryColor,
  { fill: string; svgFill: string; tint: string; activeShadow: string }
> = {
  secondary: {
    fill: "bg-secondary",
    svgFill: "fill-secondary",
    tint: "bg-secondary/10 [--tint:var(--color-secondary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-secondary)]",
  },
  accent: {
    fill: "bg-accent",
    svgFill: "fill-accent",
    tint: "bg-accent/10 [--tint:var(--color-accent)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-accent)]",
  },
  tertiary: {
    fill: "bg-tertiary",
    svgFill: "fill-tertiary",
    tint: "bg-tertiary/10 [--tint:var(--color-tertiary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-tertiary)]",
  },
  sky: {
    fill: "bg-sky",
    svgFill: "fill-sky",
    tint: "bg-sky/10 [--tint:var(--color-sky)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-sky)]",
  },
  quaternary: {
    fill: "bg-quaternary",
    svgFill: "fill-quaternary",
    tint: "bg-quaternary/10 [--tint:var(--color-quaternary)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-quaternary)]",
  },
  tangerine: {
    fill: "bg-tangerine",
    svgFill: "fill-tangerine",
    tint: "bg-tangerine/10 [--tint:var(--color-tangerine)]",
    activeShadow: "shadow-[4px_4px_0_0_var(--color-tangerine)]",
  },
};
