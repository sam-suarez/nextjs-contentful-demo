import { LayoutGrid } from "@/components/client/layout-toggle";
import { ProductCard } from "@/components/product-card";
import type { CatalogProduct } from "@/lib/products/types";

/**
 * The wrapper is the island's <LayoutGrid> (`group` + `data-layout`, flipped client-side); the
 * grid and the server-rendered cards inside switch columns, orientation and spec blocks with
 * group-data utilities. Must be inside a <LayoutProvider>.
 */
export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <LayoutGrid>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 group-data-[layout=specs]:sm:grid-cols-1 group-data-[layout=specs]:md:grid-cols-2 group-data-[layout=specs]:lg:grid-cols-2 group-data-[layout=specs]:xl:grid-cols-2">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </div>
    </LayoutGrid>
  );
}
