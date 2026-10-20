# Architecture and conventions

Source of truth for how the app is built. Agent definitions in `/agents/` and the path-scoped rules in `.claude/rules/` cite this file; when they disagree, this file wins. Decision IDs (D-xxx) point to `docs/decisions.md`. Layout, copy and visual style live in `docs/design.md` (D-028); on rendering, data or auth this file wins.

## Stack

Next.js 16 (App Router, Cache Components + Partial Prefetching on), React 19, TypeScript, Tailwind v4 (CSS-first, no `tailwind.config.js`), Contentful (live) or `src/data/products.mock.json` (mock), zod, jose, Vitest, Playwright.

## Routes (D-017, D-018)

| Route | Renders | Auth |
|---|---|---|
| `/` | Catalog: one grid sorted by name. Set A always; with a session, Set B products are mixed into the same grid with a "Members only" badge. Filters + layout toggle | Public; content depends on session |
| `/products/[slug]` | Product detail | Set B slug without session: 307 to `/login?next=/products/<slug>`. Unknown slug: `notFound()` |
| `/login` | Login form: `username` + `password`, any non-empty values are accepted; the password is never stored. Empty input redirects to `/login?error=missing` (keeping `next`) | Logged-in visitors are redirected to `/` |

Logout is a server action, not a route. `next` is only followed if it is a same-origin relative path (starts with `/`, not `//`).

## Directory layout (D-022)

```
src/
  app/                  routes only, server components
  components/           server components (cards, grid, filter form, price)
  components/client/    the ONLY place 'use client' may appear
  lib/                  server-only: DAL, session, auth actions, Contentful adapters, filtering
  schemas/              isomorphic zod schemas and types (D-016)
  data/                 products.mock.json (generated, never hand-edited)
public/products/        product SVGs (source of truth for art)
```

## Server/client boundary (D-019, D-020, D-022)

- Prices, Set B products and anything derived from the session render in **server components only**.
- `'use client'` is allowed only under `src/components/client/`. Check: `scripts/check-client-boundary.sh`.
- Client islands never receive prices, Set B data or session data as props. They receive plain UI state (e.g. the current layout) and server-rendered `children`.
- Session routes (`/`, `/products/[slug]`, and `/login`, which reads the session to redirect) export `instant = false` so they render fully on the server and the HTML contains the prices in `<body>`.
- The root layout never reads the session (that would make every route block). The session-aware site header is rendered by each session route; `/login` and `not-found.tsx` use a header variant that reads no session (`docs/design.md`, Page shell).
- **Never** wrap prices or Set B content in `<Suspense>` or a `loading.tsx`. A probe showed streamed content lands in `<div hidden>` and a no-JS visitor sees only the fallback (D-020).

## Data access (D-016, D-017, D-020, D-021)

- Every file in `src/lib/**` starts with `import "server-only";`.
- Only `src/lib/**` may read cookies or call Contentful. Pages and components call DAL functions; they never fetch directly.
- DAL (`src/lib/dal.ts`):
  - `verifySession()`: reads and verifies the session cookie (jose, HS256, D-012), wrapped in React `cache`. Returns the session or `null`.
  - `getProducts()`: resolves the session, then calls `fetchProducts(sets)` with `["public"]` or `["public", "authenticated"]`.
  - `getProductBySlug(slug)`: same session check. Returns the product, or signals "requires login" / "not found".
- `fetchProducts(sets)` is **not exported**, uses `'use cache'` + `cacheLife(...)` + `cacheTag("products")`, and is keyed only by `sets` (never by cookie or user data).
- Source selection: all three `CONTENTFUL_*` vars set (non-empty) means the live adapter; otherwise the mock adapter. An empty string counts as unset. No override. One server log line names the active source. Both adapters apply the same visibility filter.
- Live adapter: `client.withoutUnresolvableLinks.getEntries({ content_type: "product", "fields.visibility[in]": sets.join(","), order: ["fields.name"] })`. Parse the result with `productCollectionSchema`.
- Live image URLs are protocol-relative (`//images.ctfassets.net/...`): prefix `https:`. Mock image URLs are `/products/<file>.svg`.

## Filtering and layout (D-019)

- State lives in URL search params: `category`, `q`, `layout` (`price` | `specs`).
- The page awaits `searchParams`, validates them (unknown category/layout values are ignored), and filters on the server.
- Filter controls: search is `next/form` with GET (hidden inputs keep `category` and `layout`); category chips are `<Link>`s that keep `q` and `layout`. Clear Filters: `<Link href="/">`.
- Layout toggle: a client island flips `data-layout` on the grid wrapper and keeps the URL in sync. Its options are real links, so it still works without JS. Both card variants are server-rendered; Tailwind `group-data-[layout=specs]:` utilities switch columns, orientation and the visible spec block, and move the single price element with `order-*`. No refetch. Until the island exists (P05), the options are plain server links.

## Auth (D-012, D-017)

- Session cookie: named `session`, a jose HS256 JWT signed with `SESSION_SECRET` (required, at least 32 characters; session functions throw if it is missing or too short). Flags: `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, 7-day expiry. Payload holds only the display name and expiry.
- Login and logout are server actions in `src/lib/auth/actions.ts`; they validate input with zod and re-check the session themselves.
- `proxy.ts` (Node runtime in Next 16) does optimistic redirects only. It is never the authorization check.

## Error handling

- Missing product image: placeholder rendered by the card (the mock and live data both include `bubble-bath-whale` without an image).
- Product images are SVG: render with `next/image` and `unoptimized`; `next.config.ts` lists `images.ctfassets.net` in `images.remotePatterns`.
- Empty filter results: an empty state with a Clear Filters link.
- Unknown slug: `notFound()` with a route-level `not-found.tsx`.

## Tests

- Unit tests are colocated `*.test.ts` files, run by Vitest in Node. `server-only` is aliased to an empty module in `vitest.config.mts`.
- Unit tests use the mock data and never touch the network.
- SSR checks (`scripts/verify-ssr.sh`, Playwright no-JS) run without `CONTENTFUL_*` vars so they get deterministic mock data. Because Next loads `.env.local` itself, the checks export the three vars as empty strings (Next never overwrites a var already in the environment) and set their own `SESSION_SECRET`.
- SSR checks assert both directions: Set B and authenticated prices present with a session, absent without one. They also assert that prices are not inside a `<div hidden>` streaming wrapper and that no Suspense fallback text is in the body (D-020: curl + grep alone passes on streamed content).
