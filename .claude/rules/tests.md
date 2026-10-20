---
paths:
  - "**/*.test.ts"
---

# Unit test rules

Full context: `docs/architecture.md` (Tests).

- Colocate `<module>.test.ts` next to the module it tests.
- Keep tests flat: at most one `describe` per file, one behavior per `it`.
- Use `src/data/products.mock.json` for product data. No network calls, no live Contentful.
- Test behavior through exported functions; do not export internals just to test them.
