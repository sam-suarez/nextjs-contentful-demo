import { Check } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MembersOnlyBadge } from "@/components/badge";
import { catalogHref } from "@/components/catalog-params";
import { CATEGORY_META } from "@/components/categories";
import { Price } from "@/components/price";
import { ProductImageFrame } from "@/components/product-image-frame";
import { SiteHeader } from "@/components/site-header";
import { ProductDetailSkeleton } from "@/components/skeletons";
import {
  BREADCRUMB_TEXT,
  BUTTON_SECONDARY,
  COLOR_CLASSES,
  DETAIL_BODY,
  DETAIL_CATEGORY_ROW,
  DETAIL_GRID,
  DETAIL_IMAGE_COLUMN,
  DETAIL_IMAGE_SIZE,
  DETAIL_INFO_COLUMN,
  DETAIL_PRICE_CARD,
  DETAIL_PRICE_FOOTER,
  DETAIL_PRICE_FOOTER_MEMBER,
  DETAIL_PRICE_FOOTER_STACK,
  DETAIL_SPECS,
  DETAIL_TITLE_TEXT,
  FEATURE_ICON,
  FEATURE_ITEM,
  FEATURE_LIST,
  ICON_CIRCLE,
  LABEL,
  SECTION_HEADING,
  TEXT_LINK,
} from "@/components/ui-classes";
import { getProductBySlug } from "@/lib/dal";

// The header frame is static; everything that depends on `params` and the DAL (session) streams
// in behind Suspense with a same-size skeleton (D-031). A logged-out Set B slug never gets here:
// src/proxy.ts answers 307 first (D-032). The page still handles the DAL's result itself.
export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <>
      <SiteHeader variant="session" />
      <main className="flex-1">
        <Suspense fallback={<ProductDetailSkeleton />}>
          <ProductDetail params={props.params} />
        </Suspense>
      </main>
    </>
  );
}

async function ProductDetail({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (result.status === "not-found") notFound();
  if (result.status === "requires-login") redirect("/login?next=/products/" + slug);

  const { product } = result;
  const meta = CATEGORY_META[product.category];
  const colors = COLOR_CLASSES[meta.color];
  const Icon = meta.icon;
  const membersOnly = product.visibility === "authenticated";
  const isMember = product.priceTier === "member";

  return (
    <div className={DETAIL_BODY}>
      <nav aria-label="Breadcrumb" className={`${BREADCRUMB_TEXT} text-muted-foreground`}>
        <Link href="/" className={TEXT_LINK}>
          Catalog
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href={catalogHref({ category: product.category })} className={TEXT_LINK}>
          {meta.label}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className={DETAIL_GRID}>
        <div className={DETAIL_IMAGE_COLUMN}>
          <ProductImageFrame
            shape="blob"
            image={product.image}
            name={product.name}
            category={product.category}
            className={DETAIL_IMAGE_SIZE}
          />
        </div>

        <div className={DETAIL_INFO_COLUMN}>
          <div className={DETAIL_CATEGORY_ROW}>
            <span
              className={`${ICON_CIRCLE} inline-flex items-center justify-center rounded-full border-2 border-foreground text-foreground ${colors.fill}`}
            >
              <Icon aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
            </span>
            <span className={LABEL}>{meta.label}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className={DETAIL_TITLE_TEXT}>{product.name}</h1>
            {membersOnly && <MembersOnlyBadge />}
          </div>

          <p className="text-muted-foreground">{product.description}</p>

          {/* Same height in both states (DETAIL_PRICE_FOOTER), so the skeleton matches either. */}
          <div className={DETAIL_PRICE_CARD}>
            <Price amount={product.price} tier={product.priceTier} savingsPercent={product.savingsPercent} />
            {isMember ? (
              <div className={`${DETAIL_PRICE_FOOTER} ${DETAIL_PRICE_FOOTER_MEMBER}`}>
                <span className={`${ICON_CIRCLE} inline-flex shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-quaternary text-foreground`}>
                  <Check aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold">Member price applied</p>
                  <p className="text-sm text-muted-foreground">You&apos;re signed in, so this price is yours.</p>
                </div>
              </div>
            ) : (
              <div className={`${DETAIL_PRICE_FOOTER} ${DETAIL_PRICE_FOOTER_STACK}`}>
                <p className="text-sm text-muted-foreground">Members get lower prices on every toy.</p>
                <Link href={`/login?next=/products/${product.slug}`} className={BUTTON_SECONDARY}>
                  Sign in for member pricing
                </Link>
              </div>
            )}
          </div>

          <section>
            <h2 className={SECTION_HEADING}>Details</h2>
            <dl className={DETAIL_SPECS}>
              <dt className="font-bold">Age range</dt>
              <dd className="text-right">{product.ageRange}</dd>
              <dt className="font-bold">Material</dt>
              <dd className="text-right">{product.material}</dd>
            </dl>
          </section>

          {product.features.length > 0 && (
            <section>
              <h2 className={SECTION_HEADING}>What makes it special</h2>
              <ul className={FEATURE_LIST}>
                {product.features.map((feature) => (
                  <li key={feature} className={FEATURE_ITEM}>
                    <span className={`${FEATURE_ICON} inline-flex items-center justify-center rounded-full bg-quaternary text-foreground`}>
                      <Check aria-hidden="true" strokeWidth={2.5} className="h-3.5 w-3.5" />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link href="/" className={TEXT_LINK}>
            Back to catalog
          </Link>
        </div>
      </div>
    </div>
  );
}
