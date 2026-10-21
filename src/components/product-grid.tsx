import type { CatalogLayout } from "@/components/catalog-params";
import { ProductCard } from "@/components/product-card";
import type { CatalogProduct } from "@/lib/products/types";

/**
 * The wrapper carries `group` and `data-layout` (the P05 island flips it); the grid and the
 * cards inside switch columns, orientation and spec blocks with group-data utilities.
 */
export function ProductGrid({ products, layout }: { products: CatalogProduct[]; layout: CatalogLayout }) {
  return (
    <div data-layout={layout} className="group">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 group-data-[layout=specs]:sm:grid-cols-1 group-data-[layout=specs]:md:grid-cols-2 group-data-[layout=specs]:lg:grid-cols-2 group-data-[layout=specs]:xl:grid-cols-2">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </div>
  );
}
