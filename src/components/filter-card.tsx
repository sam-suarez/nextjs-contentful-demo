import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { catalogHref, type CatalogParams } from "@/components/catalog-params";
import { CATEGORY_META } from "@/components/categories";
import { LayoutToggle } from "@/components/client/layout-toggle";
import { formatToyCount } from "@/components/format";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CATEGORY_CHIP,
  CHIP_ROW,
  COLOR_CLASSES,
  COUNT_TEXT,
  FILTER_CARD_FRAME,
  FILTER_FOOTER_ROW,
  FILTER_LAYOUT_COLUMN,
  FILTER_SEARCH_COLUMN,
  FILTER_SEARCH_ROW,
  FILTER_TOP_ROW,
  INPUT,
  LABEL,
  LAYOUT_TRACK,
  SEARCH_INPUT_SIZE,
} from "@/components/ui-classes";
import { CATEGORIES, type Category } from "@/schemas/product";

/** Search (GET form), category chips, layout toggle (island; real links without JS), count and Clear filters. Works without JS. */
export function FilterCard({ params, count }: { params: CatalogParams; count: number }) {
  const { category, q, layout } = params;

  return (
    <section aria-label="Filters" className={FILTER_CARD_FRAME}>
      <div className={FILTER_TOP_ROW}>
        <Form action="/" className={FILTER_SEARCH_COLUMN}>
          <label htmlFor="catalog-search" className={LABEL}>
            Search
          </label>
          <div className={FILTER_SEARCH_ROW}>
            <input
              id="catalog-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search toys by name or feature"
              className={`${INPUT} ${SEARCH_INPUT_SIZE}`}
            />
            {category && <input type="hidden" name="category" value={category} />}
            {layout === "specs" && <input type="hidden" name="layout" value="specs" />}
            <button type="submit" className={BUTTON_PRIMARY}>
              <Search aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
              Search
            </button>
          </div>
        </Form>

        <div className={FILTER_LAYOUT_COLUMN}>
          <p id="layout-label" className={LABEL}>
            Layout
          </p>
          <div
            role="group"
            aria-labelledby="layout-label"
            className={`${LAYOUT_TRACK} border-foreground bg-muted`}
          >
            <LayoutToggle
              hrefs={{
                price: catalogHref({ category, q, layout: "price" }),
                specs: catalogHref({ category, q, layout: "specs" }),
              }}
            />
          </div>
        </div>
      </div>

      <nav aria-label="Categories">
        <ul className={CHIP_ROW}>
          <li>
            <CategoryChip label="All" href={catalogHref({ category: null, q, layout })} active={category === null} />
          </li>
          {CATEGORIES.map((value) => (
            <li key={value}>
              <CategoryChip
                category={value}
                label={CATEGORY_META[value].label}
                href={catalogHref({ category: value, q, layout })}
                active={category === value}
              />
            </li>
          ))}
        </ul>
      </nav>

      <div className={FILTER_FOOTER_ROW}>
        <p className={COUNT_TEXT}>{formatToyCount(count)}</p>
        <Link href="/" className={BUTTON_SECONDARY}>
          Clear filters
        </Link>
      </div>
    </section>
  );
}

function CategoryChip({
  label,
  href,
  active,
  category,
}: {
  label: string;
  href: string;
  active: boolean;
  category?: Category;
}) {
  const colors = category ? COLOR_CLASSES[CATEGORY_META[category].color] : null;
  const activeClasses = `bg-foreground text-white ${colors ? colors.activeShadow : "shadow-pop-accent"}`;
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`${CATEGORY_CHIP} ${active ? activeClasses : "bg-card text-foreground hover:bg-muted"}`}
    >
      {colors && (
        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full border-2 border-foreground ${colors.fill}`} />
      )}
      {label}
    </Link>
  );
}
