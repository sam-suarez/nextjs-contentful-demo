---
paths:
  - "src/app/**"
  - "src/components/**"
---

# SSR rendering rules

Full context: `docs/architecture.md` (Server/client boundary). Requirement: prices and role-based content are in the initial HTML.

- Do not add `'use client'` here. Client code goes only in `src/components/client/`. Run `scripts/check-client-boundary.sh`.
- Prices, Set B products and session-derived content render in server components.
- `/` and `/products/[slug]` export `instant = false`. If the build says "uncached or runtime data accessed outside of `<Suspense>`", the fix is `instant = false`, not `<Suspense>`.
- Never wrap prices or Set B content in `<Suspense>` and never add a `loading.tsx` above them.
- Do not read cookies or call Contentful here. Call the DAL in `src/lib/dal.ts`.
