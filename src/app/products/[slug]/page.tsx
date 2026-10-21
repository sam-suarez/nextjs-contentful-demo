import { Check } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { MembersOnlyBadge } from "@/components/badge";
import { catalogHref } from "@/components/catalog-params";
import { CATEGORY_META } from "@/components/categories";
import { Price } from "@/components/price";
import { ProductImageFrame } from "@/components/product-image-frame";
import { SiteHeader } from "@/components/site-header";
import { BUTTON_SECONDARY, CARD_BASE, COLOR_CLASSES, CONTAINER, LABEL, TEXT_LINK } from "@/components/ui-classes";
import { getProductBySlug } from "@/lib/dal";

// Render fully on the server per request: prices and Set B are in the initial HTML (D-020).
export const instant = false;

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  // Mark the whole page as request-time so it builds as fully dynamic (not a
  // partial prerender) and notFound()/redirect() set real 404/307 statuses.
  await connection();
  const { slug } = await props.params;
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
    <>
      <SiteHeader variant="session" />
      <main className="flex-1">
        <div className={`${CONTAINER} flex flex-col gap-6 py-8`}>
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
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

          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ProductImageFrame
                shape="blob"
                image={product.image}
                name={product.name}
                category={product.category}
                className="mx-auto max-w-md"
              />
            </div>

            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground text-foreground ${colors.fill}`}
                >
                  <Icon aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
                </span>
                <span className={LABEL}>{meta.label}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-title-sm leading-tight font-extrabold md:text-title">
                  {product.name}
                </h1>
                {membersOnly && <MembersOnlyBadge />}
              </div>

              <p className="text-muted-foreground">{product.description}</p>

              <div className={`${CARD_BASE} sticker p-4`}>
                <Price amount={product.price} tier={product.priceTier} />
                {!isMember && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border pt-3">
                    <p className="text-sm text-muted-foreground">Members get lower prices on every toy.</p>
                    <Link href={`/login?next=/products/${product.slug}`} className={BUTTON_SECONDARY}>
                      Sign in for member pricing
                    </Link>
                  </div>
                )}
              </div>

              <section>
                <h2 className="mb-2 font-heading text-lg font-bold">Details</h2>
                <dl className={`${CARD_BASE} grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm`}>
                  <dt className="font-bold">Age range</dt>
                  <dd className="text-right">{product.ageRange}</dd>
                  <dt className="font-bold">Material</dt>
                  <dd className="text-right">{product.material}</dd>
                </dl>
              </section>

              {product.features.length > 0 && (
                <section>
                  <h2 className="mb-2 font-heading text-lg font-bold">What makes it special</h2>
                  <ul className="flex flex-col gap-2 text-sm">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-quaternary text-foreground">
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
      </main>
    </>
  );
}
