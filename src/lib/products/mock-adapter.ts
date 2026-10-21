import "server-only";

import mockData from "@/data/products.mock.json";
import { productCollectionSchema, type ProductEntry, type Visibility } from "@/schemas/product";

/** Mock source: the parsed entries whose visibility is in `sets`, sorted by name (R3). */
export async function fetchMockProducts(sets: readonly Visibility[]): Promise<ProductEntry[]> {
  const { items } = productCollectionSchema.parse(mockData);
  return items
    .filter((entry) => sets.includes(entry.fields.visibility))
    .sort((a, b) => a.fields.name.localeCompare(b.fields.name, "en"));
}
