import "server-only";

import { createClient } from "contentful";

import { productCollectionSchema, type ProductEntry, type Visibility } from "@/schemas/product";

/**
 * Live source (R4-R6): queries Contentful with the visibility filter, parses the result
 * with productCollectionSchema (rejects on a bad shape) and re-applies the same
 * visibility filter as the mock adapter. Image URLs are returned as parsed.
 */
export async function fetchContentfulProducts(sets: readonly Visibility[]): Promise<ProductEntry[]> {
  const client = createClient({
    space: (process.env.CONTENTFUL_SPACE_ID ?? "").trim(),
    environment: (process.env.CONTENTFUL_ENVIRONMENT ?? "").trim(),
    accessToken: (process.env.CONTENTFUL_DELIVERY_TOKEN ?? "").trim(),
  });

  const response = await client.withoutUnresolvableLinks.getEntries({
    content_type: "product",
    "fields.visibility[in]": sets.join(","),
    order: ["fields.name"],
  });

  const { items } = productCollectionSchema.parse(response);
  return items.filter((entry) => sets.includes(entry.fields.visibility));
}
