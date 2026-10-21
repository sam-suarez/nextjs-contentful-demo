import { Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { catalogHref, type CatalogParams } from "@/components/catalog-params";
import { CATEGORY_META } from "@/components/categories";
import { LayoutToggle } from "@/components/client/layout-toggle";
import { formatToyCount } from "@/components/format";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CARD_BASE, COLOR_CLASSES, LABEL } from "@/components/ui-classes";
import { CATEGORIES, type Category } from "@/schemas/product";

const CHIP =
  "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-foreground px-4 text-sm font-bold";

/** Search (GET form), category chips, layout toggle (island; real links without JS), count and Clear filters. Works without JS. */
export function FilterCard({ params, count }: { params: CatalogParams; count: number }) {
  const { category, q, layout } = params;

  return (
    <section aria-label="Filters" className={`${CARD_BASE} sticker flex flex-col gap-5 p-4 md:p-6`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <Form action="/" className="flex flex-1 flex-col gap-2 md:max-w-xl">
          <label htmlFor="catalog-search" className={LABEL}>
            Search
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="catalog-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search toys by name or feature"
              className="min-h-12 flex-1 rounded-lg border-2 border-input-border bg-input px-4 placeholder:text-muted-foreground focus:border-accent focus:shadow-pop-accent"
            />
            {category && <input type="hidden" name="category" value={category} />}
            {layout === "specs" && <input type="hidden" name="layout" value="specs" />}
            <button type="submit" className={BUTTON_PRIMARY}>
              <Search aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
              Search
            </button>
          </div>
        </Form>

        <div className="flex flex-col gap-2">
          <p id="layout-label" className={LABEL}>
            Layout
          </p>
          <div
            role="group"
            aria-labelledby="layout-label"
            className="inline-flex w-fit gap-1 rounded-full border-2 border-foreground bg-muted p-1"
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
        <ul className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-4">
        <p className="font-heading text-lg font-bold">{formatToyCount(count)}</p>
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
      className={`${CHIP} ${active ? activeClasses : "bg-card text-foreground hover:bg-muted"}`}
    >
      {colors && (
        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full border-2 border-foreground ${colors.fill}`} />
      )}
      {label}
    </Link>
  );
}
