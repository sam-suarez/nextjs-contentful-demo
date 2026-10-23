import "server-only";

import type { Category, Visibility } from "@/schemas/product";

export type PriceTier = "everyday" | "member";

export type ProductImage = {
  url: string; // absolute https URL (live) or /products/<file>.svg (mock)
  alt: string; // asset description, else asset title
  width: number | null;
  height: number | null;
};

/** The view model pages render: one price, already chosen for this visitor by the DAL. */
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  visibility: Visibility;
  description: string;
  ageRange: string;
  material: string;
  features: string[]; // [] when the entry has none
  image: ProductImage | null; // null -> card renders the placeholder (P03)
  price: number; // the one price this visitor may see
  priceTier: PriceTier; // "everyday" logged out, "member" logged in
  savingsPercent: number | null; // D-036: whole percent for member tier with a saving, else null
};
