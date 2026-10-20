---
paths:
  - "src/components/client/**"
---

# Client island rules

Full context: `docs/architecture.md` (Server/client boundary, Filtering and layout).

- This is the only directory where `'use client'` is allowed.
- Props carry UI state only (e.g. current layout, current query string) plus server-rendered `children`. Never pass prices, product lists, Set B data or session data as props.
- Do not import from `src/lib/**` (it is server-only).
- State that affects what the server renders belongs in the URL (`category`, `q`, `layout`), not in client state alone.
