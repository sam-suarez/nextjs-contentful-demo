// Schema for the Contentful `product` content type, derived from a real
// Content Delivery API response (see scripts/snapshot-contentful.mjs).
//
// It describes the shape the Contentful SDK returns from
// `client.withoutUnresolvableLinks.getEntries({ content_type: "product" })`:
// links resolved inline, `image` either a full Asset or absent. Both the live
// response and src/data/products.mock.json must parse with it.
//
// Isomorphic on purpose (no `server-only`): client components need the
// Category/Visibility types and values for filter UI.

import { z } from "zod";

export const VISIBILITIES = ["public", "authenticated"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const CATEGORIES = [
  "rattles-teethers",
  "plush",
  "stacking-sorting",
  "bath",
  "activity-sensory",
  "musical",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const assetSchema = z.object({
  sys: z.object({
    id: z.string(),
    type: z.literal("Asset"),
  }),
  fields: z.object({
    title: z.string(),
    description: z.string().optional(),
    file: z.object({
      // Live: protocol-relative CDN URL ("//images.ctfassets.net/...").
      // Mock: root-relative local path ("/products/<fileName>").
      url: z.string(),
      fileName: z.string(),
      contentType: z.string(),
      details: z.object({
        size: z.number(),
        image: z.object({ width: z.number(), height: z.number() }).optional(),
      }),
    }),
  }),
});
export type ProductAsset = z.infer<typeof assetSchema>;

export const productEntrySchema = z.object({
  sys: z.object({
    id: z.string(),
    type: z.literal("Entry"),
    updatedAt: z.string(),
    contentType: z.object({
      sys: z.object({ id: z.literal("product") }),
    }),
  }),
  fields: z.object({
    name: z.string().min(1),
    slug: z.string().regex(SLUG_PATTERN),
    visibility: z.enum(VISIBILITIES),
    category: z.enum(CATEGORIES),
    description: z.string(),
    priceLoggedOut: z.number().nonnegative(),
    priceAuthenticated: z.number().nonnegative(),
    image: assetSchema.optional(),
    ageRange: z.string(),
    material: z.string(),
    features: z.array(z.string()).max(4).optional(),
  }),
});
export type ProductEntry = z.infer<typeof productEntrySchema>;

export const productCollectionSchema = z.object({
  total: z.number(),
  items: z.array(productEntrySchema),
});
export type ProductCollection = z.infer<typeof productCollectionSchema>;
