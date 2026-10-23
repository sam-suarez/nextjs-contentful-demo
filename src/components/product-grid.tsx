import type { CatalogSort } from "@/components/catalog-params";
import { LayoutGrid } from "@/components/client/layout-toggle";
import { PriceSortedCards } from "@/components/client/price-sort";
import { ProductCard } from "@/components/product-card";
import { PRODUCT_GRID_COLUMNS } from "@/components/ui-classes";
import type { CatalogProduct } from "@/lib/products/types";

/**
 * The wrapper is the island's <LayoutGrid> (`group` + `data-layout`, flipped client-side); the
 * grid and the server-rendered cards inside switch columns, orientation and spec blocks with
 * group-data utilities. Must be inside a <LayoutProvider>.
 *
 * `products` arrive filtered and sorted by the page; the sort island re-indexes the cards with
 * `orders` (computed by the page on this list) after a client-side sort click (D-038). It renders
 * no element, so the cards stay direct children of the grid.
 */
export function ProductGrid({
  products,
  sort,
  orders,
}: {
  products: CatalogProduct[];
  sort: CatalogSort | null;
  orders: Record<CatalogSort, number[]>;
}) {
  return (
    <LayoutGrid>
      <div className={`${PRODUCT_GRID_COLUMNS} group-data-[layout=specs]:sm:grid-cols-1 group-data-[layout=specs]:md:grid-cols-2 group-data-[layout=specs]:lg:grid-cols-2 group-data-[layout=specs]:xl:grid-cols-2`}>
        <PriceSortedCards sort={sort} orders={orders}>
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </PriceSortedCards>
      </div>
    </LayoutGrid>
  );
}
