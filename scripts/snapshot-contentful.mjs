// Regenerates src/data/products.mock.json from the live Contentful space.
//
// The mock is the exact collection the Contentful SDK returns for the product
// query (same client mode, same ordering), so mock mode and live mode feed the
// same parsing code. The only change: asset URLs are rewritten from the
// Contentful CDN to the local copies in public/products/, so the mock works
// offline and without credentials.
//
// Usage: npm run snapshot:contentful   (reads CONTENTFUL_* from .env.local)

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "contentful";

const root = fileURLToPath(new URL("..", import.meta.url));
const outFile = `${root}src/data/products.mock.json`;

for (const key of ["CONTENTFUL_SPACE_ID", "CONTENTFUL_ENVIRONMENT", "CONTENTFUL_DELIVERY_TOKEN"]) {
  if (!process.env[key]) throw new Error(`Missing ${key} (expected in .env.local)`);
}

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  environment: process.env.CONTENTFUL_ENVIRONMENT,
  accessToken: process.env.CONTENTFUL_DELIVERY_TOKEN,
});

// withoutUnresolvableLinks: an unpublished/deleted image is dropped (field
// absent) instead of left as a bare Link, so it hits the missing-image fallback.
const collection = await client.withoutUnresolvableLinks.getEntries({
  content_type: "product",
  order: ["fields.name"],
});

function rewriteAssetUrls(node) {
  if (Array.isArray(node)) return node.forEach(rewriteAssetUrls);
  if (node === null || typeof node !== "object") return;
  const file = node.file;
  if (file && typeof file.url === "string" && typeof file.fileName === "string") {
    if (!existsSync(`${root}public/products/${file.fileName}`)) {
      throw new Error(`Asset ${file.fileName} has no local copy in public/products/`);
    }
    file.url = `/products/${file.fileName}`;
  }
  Object.values(node).forEach(rewriteAssetUrls);
}

rewriteAssetUrls(collection);
await writeFile(outFile, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Wrote ${collection.items.length} products to ${outFile}`);
