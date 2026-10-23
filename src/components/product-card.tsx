import type { CSSProperties } from "react";
import Link from "next/link";

import { MembersOnlyBadge } from "@/components/badge";
import { CATEGORY_META } from "@/components/categories";
import { Price } from "@/components/price";
import { ProductImageFrame } from "@/components/product-image-frame";
import {
  CARD_META_TEXT,
  COLOR_CLASSES,
  PRODUCT_CARD_BODY,
  PRODUCT_CARD_FRAME,
  PRODUCT_CARD_ICON,
  PRODUCT_CARD_IMAGE_BOX,
  PRODUCT_NAME_TEXT,
} from "@/components/ui-classes";
import type { CatalogProduct } from "@/lib/products/types";

/**
 * One <article> holding both layouts. The grid wrapper (`group`, `data-layout`) switches
 * orientation, the visible spec block and the price position with group-data utilities.
 * The price is rendered once and moved with order-*.
 */
export function ProductCard({ product, index }: { product: CatalogProduct; index: number }) {
  const meta = CATEGORY_META[product.category];
  const colors = COLOR_CLASSES[meta.color];
  const Icon = meta.icon;
  const membersOnly = product.visibility === "authenticated";
  const highlight = product.features[0];

  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className={`pop-in sticker-card ${membersOnly ? "sticker-member" : "sticker"} ${PRODUCT_CARD_FRAME} group-data-[layout=specs]:sm:flex-row`}
    >
      <div className={`${PRODUCT_CARD_IMAGE_BOX} group-data-[layout=specs]:sm:w-40 group-data-[layout=specs]:sm:shrink-0 group-data-[layout=specs]:sm:pr-0`}>
        <ProductImageFrame
          image={product.image}
          name={product.name}
          category={product.category}
          className="group-data-[layout=specs]:max-w-32 group-data-[layout=specs]:rounded-tl-2xl group-data-[layout=specs]:rounded-tr-2xl group-data-[layout=specs]:rounded-br-2xl group-data-[layout=specs]:rounded-bl-none"
        />
      </div>

      <div className={`${PRODUCT_CARD_BODY} group-data-[layout=specs]:pt-3`}>
        <span
          className={`wiggle ${PRODUCT_CARD_ICON} inline-flex items-center justify-center rounded-full border-2 border-foreground text-foreground ${colors.fill} order-1 group-data-[layout=specs]:hidden`}
        >
          <Icon aria-hidden="true" strokeWidth={2.5} className="h-5 w-5" />
        </span>

        <Price
          amount={product.price}
          tier={product.priceTier}
          savingsPercent={product.savingsPercent}
          className="order-2 group-data-[layout=specs]:order-last group-data-[layout=specs]:mt-1 group-data-[layout=specs]:flex-row group-data-[layout=specs]:items-baseline group-data-[layout=specs]:justify-between group-data-[layout=specs]:border-t-2 group-data-[layout=specs]:border-border group-data-[layout=specs]:pt-2"
        />

        <div className="order-3 flex flex-wrap items-center gap-2 group-data-[layout=specs]:order-1">
          <h2 className={PRODUCT_NAME_TEXT}>
            <Link
              href={"/products/" + product.slug}
              className="rounded-sm after:absolute after:inset-0 after:rounded-xl"
            >
              {product.name}
            </Link>
          </h2>
          {membersOnly && <MembersOnlyBadge />}
        </div>

        <p className={`${CARD_META_TEXT} order-4 flex items-center gap-2 font-medium text-muted-foreground group-data-[layout=specs]:order-2`}>
          <span
            className={`wiggle hidden h-7 w-7 items-center justify-center rounded-full border-2 border-foreground text-foreground group-data-[layout=specs]:inline-flex ${colors.fill}`}
          >
            <Icon aria-hidden="true" strokeWidth={2.5} className="h-4 w-4" />
          </span>
          {meta.label}
        </p>

        <p className={`${CARD_META_TEXT} order-5 text-muted-foreground group-data-[layout=specs]:hidden`}>
          {`${product.ageRange} · ${product.material}`}
        </p>

        <dl className="order-3 hidden text-sm group-data-[layout=specs]:grid group-data-[layout=specs]:grid-cols-[auto_1fr] group-data-[layout=specs]:gap-x-4 group-data-[layout=specs]:gap-y-1">
          <dt className="font-bold">Age range</dt>
          <dd className="text-right">{product.ageRange}</dd>
          <dt className="font-bold">Material</dt>
          <dd className="text-right">{product.material}</dd>
          {highlight !== undefined && (
            <>
              <dt className="font-bold">Highlight</dt>
              <dd className="text-right">{highlight}</dd>
            </>
          )}
        </dl>
      </div>
    </article>
  );
}
