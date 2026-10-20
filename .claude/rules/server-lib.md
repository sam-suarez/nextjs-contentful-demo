---
paths:
  - "src/lib/**"
---

# Server-only library rules

Full context: `docs/architecture.md` (Data access, Auth).

- First line of every file: `import "server-only";`
- This is the only place that reads cookies or calls Contentful.
- Exported DAL functions resolve the session themselves. Never accept a session, user or visibility set as an argument from a page.
- `fetchProducts(sets)` stays non-exported, uses `'use cache'` + `cacheLife` + `cacheTag("products")`, and is keyed only by `sets`. Never call `cookies()` inside a `'use cache'` function.
- Parse Contentful responses with `productCollectionSchema` from `src/schemas/product.ts`. Use `client.withoutUnresolvableLinks`.
- Live and mock adapters must apply the same visibility filter.
