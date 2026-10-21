import { Suspense } from "react";

import { Banner } from "@/components/banner";
import { parseCatalogParams } from "@/components/catalog-params";
import { LayoutProvider } from "@/components/client/layout-toggle";
import { EmptyState } from "@/components/empty-state";
import { FilterCard } from "@/components/filter-card";
import { LOGGED_OUT_BANNER_TEXT, memberBannerText } from "@/components/format";
import { ProductGrid } from "@/components/product-grid";
import { SiteHeader } from "@/components/site-header";
import { BannerSkeleton, CatalogSkeleton } from "@/components/skeletons";
import { TitleArea } from "@/components/title-area";
import { CATALOG_STACK, CONTAINER } from "@/components/ui-classes";
import { getProducts, verifySession } from "@/lib/dal";
import { filterProducts } from "@/lib/products/filter";

// The page shell (header frame, title area, container) is static. The parts that read request
// data (session, searchParams) stream in behind Suspense with same-size skeletons (D-031); prices
// and Set B still arrive in the same HTML response, rendered by server components only.
export default function CatalogPage(props: PageProps<"/">) {
  return (
    <>
      <SiteHeader variant="session" />
      <main className="flex-1">
        <Suspense fallback={<BannerSkeleton />}>
          <CatalogBanner />
        </Suspense>
        <TitleArea />
        <div className={`${CONTAINER} ${CATALOG_STACK}`}>
          <Suspense fallback={<CatalogSkeleton />}>
            <Catalog searchParams={props.searchParams} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

/** Session-dependent sentence; the logged-in one counts the members-only products. */
async function CatalogBanner() {
  const [session, products] = await Promise.all([verifySession(), getProducts()]);
  const membersOnlyCount = products.filter((p) => p.visibility === "authenticated").length;
  return <Banner text={session !== null ? memberBannerText(membersOnlyCount) : LOGGED_OUT_BANNER_TEXT} />;
}

/** Filter card, count and grid (or empty state): validated searchParams, filtered on the server. */
async function Catalog({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const params = parseCatalogParams(await searchParams);
  const products = await getProducts();
  const visible = filterProducts(products, { category: params.category, q: params.q });

  return (
    <LayoutProvider layout={params.layout}>
      <FilterCard params={params} count={visible.length} />
      {visible.length > 0 ? <ProductGrid products={visible} /> : <EmptyState q={params.q} />}
    </LayoutProvider>
  );
}
