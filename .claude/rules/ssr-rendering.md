---
paths:
  - "src/app/**"
  - "src/components/**"
---

# SSR rendering rules

Full context: `docs/architecture.md` (Server/client boundary). Requirement: prices and role-based content are in the initial HTML.

- Do not add `'use client'` here. Client code goes only in `src/components/client/`. Run `scripts/check-client-boundary.sh`.
- Prices, Set B products and session-derived content render in server components.
- No route exports `instant = false`. If the build says "uncached or runtime data accessed outside of `<Suspense>`", wrap the part that reads it in `<Suspense>` with the matching skeleton from `docs/design.md` (Skeleton), sized like the final component so nothing shifts. No route-level `loading.tsx` (D-031).
- Prices and Set B render in server components inside those boundaries, never in a fallback or a client island (D-031).
- A logged-out Set B slug is redirected by `src/proxy.ts`; pages still handle the DAL's "requires login" result (D-032).
- Do not read cookies or call Contentful here. Call the DAL in `src/lib/dal.ts`.
