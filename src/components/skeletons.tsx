// Suspense fallbacks for the parts of a page that read request data (D-031, docs/design.md
// Skeleton). Server components, no props, no text: each root has `aria-busy="true"` and a
// `data-skeleton` marker, every element inside is `aria-hidden="true"`. Every box that decides a
// size (frames, rows, gaps, paddings, control heights, line heights) uses the same class constant
// from ui-classes.ts as the component it stands in for, so swapping it for the real content
// shifts nothing.
import {
  BANNER_FRAME,
  BANNER_INNER,
  BREADCRUMB_TEXT,
  CARD_META_TEXT,
  CATALOG_STACK,
  CHIP_ROW,
  CONTAINER,
  CONTROL_HEIGHT,
  COUNT_TEXT,
  DETAIL_BODY,
  DETAIL_CATEGORY_ROW,
  DETAIL_GRID,
  DETAIL_IMAGE_COLUMN,
  DETAIL_IMAGE_SIZE,
  DETAIL_INFO_COLUMN,
  DETAIL_PRICE_CARD,
  DETAIL_PRICE_FOOTER,
  DETAIL_PRICE_FOOTER_STACK,
  DETAIL_SPECS,
  DETAIL_TITLE_TEXT,
  FEATURE_ICON,
  FEATURE_ITEM,
  FEATURE_LIST,
  FILTER_CARD_FRAME,
  FILTER_FOOTER_ROW,
  FILTER_LAYOUT_COLUMN,
  FILTER_SEARCH_COLUMN,
  FILTER_SEARCH_ROW,
  FILTER_TOP_ROW,
  FORM_FIELD,
  HEADER_SESSION_SLOT,
  ICON_CIRCLE,
  IMAGE_BOX,
  LABEL,
  LAYOUT_TRACK,
  LOGIN_CARD_FRAME,
  LOGIN_FORM,
  LOGIN_INTRO,
  LOGIN_NOTE,
  LOGIN_TITLE_TEXT,
  PRICE_AMOUNT_TEXT,
  PRICE_STACK,
  PRODUCT_CARD_BODY,
  PRODUCT_CARD_FRAME,
  PRODUCT_CARD_ICON,
  PRODUCT_CARD_IMAGE_BOX,
  PRODUCT_GRID_COLUMNS,
  PRODUCT_NAME_TEXT,
  SEARCH_INPUT_SIZE,
  SECTION_HEADING,
} from "@/components/ui-classes";

/** A pulsing muted fill (pulse in globals.css, off under prefers-reduced-motion). */
const FILL = "skeleton-pulse block bg-muted";
/** Stand-in for text, prices, images and inputs. */
const BLOCK = `${FILL} rounded-md`;
/** Stand-in for pills (buttons, chips, the layout options, icon circles). */
const PILL = `${FILL} rounded-full`;

/**
 * One line of text. The wrapper takes the typography classes of the text it stands in for and is
 * exactly one line box tall (`1lh`), so it has the text's height; the bar inside is thinner.
 */
function Line({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`flex h-lh items-center ${text} ${className}`}>
      <span aria-hidden="true" className={`${BLOCK} h-[0.75em] w-full`} />
    </span>
  );
}

/** Two-line price block (label over amount), as in Price. */
function PriceSkeleton() {
  return (
    <div aria-hidden="true" className={PRICE_STACK}>
      <Line text={LABEL} className="w-28" />
      <Line text={PRICE_AMOUNT_TEXT} className="w-24" />
    </div>
  );
}

/** Session controls in the header (Sign in button, or badge + name + Sign out). */
export function HeaderSessionSkeleton() {
  return (
    <div data-skeleton="header-session" aria-busy="true" className={`${HEADER_SESSION_SLOT} justify-end`}>
      <span aria-hidden="true" className={`${PILL} h-12 w-36`} />
    </div>
  );
}

/** Banner strip under the header (one sentence; logged-in copy has a count). */
export function BannerSkeleton() {
  return (
    <div data-skeleton="banner" aria-busy="true" className={BANNER_FRAME}>
      <div aria-hidden="true" className={`${CONTAINER} ${BANNER_INNER} flex flex-col`}>
        <Line text="text-sm" className="w-full max-w-xl" />
        <Line text="text-sm" className="w-2/3 sm:hidden" />
      </div>
    </div>
  );
}

// Category chip widths (All + the six categories, in order). Equal to the real chips, so the
// placeholder chips wrap onto the same number of rows at every width.
const CHIP_WIDTHS = ["w-[53px]", "w-[179px]", "w-[92.4px]", "w-[182.9px]", "w-[87.7px]", "w-[180.7px]", "w-[107.7px]"];

/** Price-first product card (image, icon circle, price, name, category, age · material). */
function CardSkeleton() {
  return (
    <div aria-hidden="true" className={`${PRODUCT_CARD_FRAME} sticker`}>
      <div aria-hidden="true" className={PRODUCT_CARD_IMAGE_BOX}>
        <span aria-hidden="true" className={`${BLOCK} ${IMAGE_BOX}`} />
      </div>
      <div aria-hidden="true" className={PRODUCT_CARD_BODY}>
        <span aria-hidden="true" className={`${PILL} ${PRODUCT_CARD_ICON}`} />
        <PriceSkeleton />
        <Line text={PRODUCT_NAME_TEXT} className="w-3/4" />
        <Line text={CARD_META_TEXT} className="w-1/2" />
        {/* Age · material: wraps to two lines in the 4-column grid for most products (mock data). */}
        <div aria-hidden="true" className="flex flex-col">
          <Line text={CARD_META_TEXT} className="w-full" />
          <Line text={CARD_META_TEXT} className="hidden w-1/3 xl:flex" />
        </div>
      </div>
    </div>
  );
}

/** Filter card (search, layout control, chips, count + Clear filters) and the product grid. */
export function CatalogSkeleton() {
  return (
    <div data-skeleton="catalog" aria-busy="true" className={CATALOG_STACK}>
      <div aria-hidden="true" className={FILTER_CARD_FRAME}>
        <div aria-hidden="true" className={FILTER_TOP_ROW}>
          <div aria-hidden="true" className={FILTER_SEARCH_COLUMN}>
            <Line text={LABEL} className="w-16" />
            <div aria-hidden="true" className={FILTER_SEARCH_ROW}>
              <span aria-hidden="true" className={`${BLOCK} ${SEARCH_INPUT_SIZE}`} />
              <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-full sm:w-32`} />
            </div>
          </div>
          <div aria-hidden="true" className={FILTER_LAYOUT_COLUMN}>
            <Line text={LABEL} className="w-16" />
            <div aria-hidden="true" className={`${LAYOUT_TRACK} border-transparent bg-muted`}>
              <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-28`} />
              <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-28`} />
            </div>
          </div>
        </div>

        <div aria-hidden="true" className={CHIP_ROW}>
          {CHIP_WIDTHS.map((width) => (
            <span key={width} aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} ${width}`} />
          ))}
        </div>

        <div aria-hidden="true" className={FILTER_FOOTER_ROW}>
          <Line text={COUNT_TEXT} className="w-20" />
          <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-40`} />
        </div>
      </div>

      <div aria-hidden="true" className={PRODUCT_GRID_COLUMNS}>
        {Array.from({ length: 8 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/** Product detail body: breadcrumb, image, and the info column (title, price card, details). */
export function ProductDetailSkeleton() {
  return (
    <div data-skeleton="product-detail" aria-busy="true" className={DETAIL_BODY}>
      <Line text={BREADCRUMB_TEXT} className="w-60 max-w-full" />

      <div aria-hidden="true" className={DETAIL_GRID}>
        <div aria-hidden="true" className={DETAIL_IMAGE_COLUMN}>
          <span aria-hidden="true" className={`${BLOCK} ${IMAGE_BOX} ${DETAIL_IMAGE_SIZE}`} />
        </div>

        <div aria-hidden="true" className={DETAIL_INFO_COLUMN}>
          <div aria-hidden="true" className={DETAIL_CATEGORY_ROW}>
            <span aria-hidden="true" className={`${PILL} ${ICON_CIRCLE}`} />
            <Line text={LABEL} className="w-20" />
          </div>

          {/* Typical product copy (mock data): a one-line name; a ~130-character description
              (4 lines below sm, 2 from sm, 3 in the narrower lg column); 4 features. */}
          <Line text={DETAIL_TITLE_TEXT} className="w-3/4" />

          <div aria-hidden="true" className="flex flex-col">
            <Line text="text-base" className="w-full" />
            <Line text="text-base" className="w-full" />
            <Line text="text-base" className="w-full sm:hidden lg:flex" />
            <Line text="text-base" className="w-1/3 sm:hidden" />
          </div>

          <div aria-hidden="true" className={DETAIL_PRICE_CARD}>
            <PriceSkeleton />
            <div aria-hidden="true" className={`${DETAIL_PRICE_FOOTER} ${DETAIL_PRICE_FOOTER_STACK}`}>
              <Line text="text-sm" className="w-56 max-w-full" />
              <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-56`} />
            </div>
          </div>

          <div aria-hidden="true">
            <Line text={SECTION_HEADING} className="w-24" />
            <div aria-hidden="true" className={DETAIL_SPECS}>
              <Line text="text-sm" className="w-20" />
              <Line text="text-sm" className="ml-auto w-24" />
              <Line text="text-sm" className="w-16" />
              <Line text="text-sm" className="ml-auto w-28" />
            </div>
          </div>

          <div aria-hidden="true">
            <Line text={SECTION_HEADING} className="w-48" />
            <div aria-hidden="true" className={FEATURE_LIST}>
              {["w-56", "w-48", "w-52", "w-40"].map((width) => (
                <div key={width} aria-hidden="true" className={FEATURE_ITEM}>
                  <span aria-hidden="true" className={`${PILL} ${FEATURE_ICON}`} />
                  <Line text="text-sm" className={width} />
                </div>
              ))}
            </div>
          </div>

          <Line text="text-base" className="w-32" />
        </div>
      </div>
    </div>
  );
}

/** Login card (title, two sentences, two labelled inputs, full-width submit button). */
export function LoginCardSkeleton() {
  return (
    <div data-skeleton="login-card" aria-busy="true" className={LOGIN_CARD_FRAME}>
      <Line text={LOGIN_TITLE_TEXT} className="w-28" />
      <div aria-hidden="true" className={`${LOGIN_INTRO} flex flex-col`}>
        <Line text="text-base" className="w-full" />
        <Line text="text-base" className="w-1/3" />
      </div>
      <div aria-hidden="true" className={`${LOGIN_NOTE} flex flex-col`}>
        <Line text="text-sm" className="w-full" />
        <Line text="text-sm" className="w-1/3 min-[440px]:hidden" />
      </div>

      <div aria-hidden="true" className={LOGIN_FORM}>
        {["username", "password"].map((field) => (
          <div key={field} aria-hidden="true" className={FORM_FIELD}>
            <Line text={LABEL} className="w-20" />
            <span aria-hidden="true" className={`${BLOCK} ${CONTROL_HEIGHT} w-full`} />
          </div>
        ))}
        <span aria-hidden="true" className={`${PILL} ${CONTROL_HEIGHT} w-full`} />
      </div>
    </div>
  );
}
