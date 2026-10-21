import "server-only";

import type { CatalogProduct, PriceTier, ProductImage } from "@/lib/products/types";
import type { ProductAsset, ProductEntry } from "@/schemas/product";

/** Live asset URLs are protocol-relative (//images.ctfassets.net/...); mock and absolute URLs pass through. */
function normalizeUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}

function toImage(asset: ProductAsset | undefined): ProductImage | null {
  if (!asset) return null;
  const { title, description, file } = asset.fields;
  return {
    url: normalizeUrl(file.url),
    alt: description ?? title,
    width: file.details.image?.width ?? null,
    height: file.details.image?.height ?? null,
  };
}

/** Maps a parsed entry to the view model, keeping only the price for `tier` (R7, R8). */
export function toCatalogProduct(entry: ProductEntry, tier: PriceTier): CatalogProduct {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    slug: f.slug,
    name: f.name,
    category: f.category,
    visibility: f.visibility,
    description: f.description,
    ageRange: f.ageRange,
    material: f.material,
    features: [...(f.features ?? [])],
    image: toImage(f.image),
    price: tier === "member" ? f.priceAuthenticated : f.priceLoggedOut,
    priceTier: tier,
  };
}
