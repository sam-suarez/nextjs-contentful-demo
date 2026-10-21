import { Banner } from "@/components/banner";
import { parseCatalogParams } from "@/components/catalog-params";
import { LayoutProvider } from "@/components/client/layout-toggle";
import { EmptyState } from "@/components/empty-state";
import { FilterCard } from "@/components/filter-card";
import { LOGGED_OUT_BANNER_TEXT, memberBannerText } from "@/components/format";
import { ProductGrid } from "@/components/product-grid";
import { SiteHeader } from "@/components/site-header";
import { TitleArea } from "@/components/title-area";
import { CONTAINER } from "@/components/ui-classes";
import { getProducts, verifySession } from "@/lib/dal";
import { filterProducts } from "@/lib/products/filter";

// Render fully on the server per request: prices and Set B are in the initial HTML (D-020).
export const instant = false;

export default async function CatalogPage(props: PageProps<"/">) {
  const params = parseCatalogParams(await props.searchParams);
  const [session, products] = await Promise.all([verifySession(), getProducts()]);
  const visible = filterProducts(products, { category: params.category, q: params.q });
  const membersOnlyCount = products.filter((p) => p.visibility === "authenticated").length;

  return (
    <>
      <SiteHeader variant="session" />
      <main className="flex-1">
        <Banner text={session !== null ? memberBannerText(membersOnlyCount) : LOGGED_OUT_BANNER_TEXT} />
        <TitleArea />
        <div className={`${CONTAINER} flex flex-col gap-10`}>
          <LayoutProvider layout={params.layout}>
            <FilterCard params={params} count={visible.length} />
            {visible.length > 0 ? <ProductGrid products={visible} /> : <EmptyState q={params.q} />}
          </LayoutProvider>
        </div>
      </main>
    </>
  );
}
