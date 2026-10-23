# Architecture and conventions

Source of truth for how the app is built. Agent definitions in `/agents/` and the path-scoped rules in `.claude/rules/` cite this file; when they disagree, this file wins. Decision IDs (D-xxx) point to `docs/decisions.md`. Layout, copy and visual style live in `docs/design.md` (D-028); on rendering, data or auth this file wins.

## Stack

Next.js 16 (App Router, Cache Components + Partial Prefetching on), React 19, TypeScript, Tailwind v4 (CSS-first, no `tailwind.config.js`), Contentful (live) or `src/data/products.mock.json` (mock), zod, jose, Vitest, Playwright.

## Routes (D-017, D-018, D-032, D-034, D-038)

| Route | Renders | Auth |
|---|---|---|
| `/` | Catalog: one grid sorted by name, or by the price the visitor sees when `sort` is set (equal prices by name). Set A always; with a session, Set B products are mixed into the same grid with a "Members only" badge. Filters + layout toggle | Public; content depends on session |
| `/products/[slug]` | Product detail | Set B slug without session: `src/proxy.ts` answers 307 to `/login?next=/products/<slug>` before rendering (D-032); the page still asks the DAL. Unknown slug: `notFound()` |
| `/login` | Login form: `username` + `password`, any non-empty values are accepted; the password is never stored. Empty input redirects to `/login?error=missing` (keeping `next`) | Logged-in visitors are redirected to `/` |
| `/logout` | Route handler, `POST` only (no page): deletes the session cookie and answers 303 with `Location: /`, so the browser does a full page load. Other methods get 405. A request whose `Origin` header is present and differs from the app's origin gets 403 | Any (with or without a session) |

Logout is the `POST /logout` route handler (`src/app/logout/route.ts`), not a server action, so sign-out ends in a full page load and the client keeps no hidden copy of the previous page (D-034). `next` is only followed if it is a same-origin relative path (starts with `/`, not `//`).

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

## Server/client boundary (D-019, D-022, D-031, D-036, D-038)

- Prices, Set B products and anything derived from the session render in **server components only**.
- The member savings line (`You save <n>%`, from `savingsPercent`) is price data: rendered in server components only, never passed to a client island, never in a skeleton (skeletons only reserve its empty row; `docs/design.md`, Price) (D-036).
- `'use client'` is allowed only under `src/components/client/`. Check: `scripts/check-client-boundary.sh`.
- Client islands never receive prices (including `savingsPercent`), Set B data or session data as props. They receive plain UI state (e.g. the current layout) and server-rendered `children`.
- The sort island receives only the current sort and, for each sort option, the card order as a list of indices into the rendered cards (numbers computed on the server), plus the server-rendered cards as `children`. Never prices, slugs or Set B data (D-038).
- Session-dependent UI, and anything else that reads request data (the session cookie, `searchParams`), sits inside an explicit `<Suspense>` boundary whose fallback is a layout-matched skeleton (`docs/design.md`, Skeleton): the same outer size as the content it replaces, so the swap causes no layout shift. Boundaries wrap the parts that read request data (the session part of the header, the banner, the catalog filter card and grid, the product detail body, the login card), not whole pages through a `loading.tsx`. No route exports `instant = false`: it only switches off a dev-time validation and does not control rendering (D-031).
- Prices and Set B still reach the browser in the initial HTML response: the streamed content is part of the same response body. Without JavaScript a visitor sees the skeleton in place of streamed content; that is accepted (D-031).
- The root layout never reads the session. The session-aware site header is rendered by each session route; `/login` and `not-found.tsx` use a header variant that reads no session (`docs/design.md`, Page shell).

## Data access (D-016, D-017, D-020, D-021, D-036, D-038)

- Every file in `src/lib/**` starts with `import "server-only";`.
- Only `src/lib/**` may read cookies or call Contentful. Pages and components call DAL functions; they never fetch directly.
- DAL (`src/lib/dal.ts`):
  - `verifySession()`: reads and verifies the session cookie (jose, HS256, D-012), wrapped in React `cache`. Returns the session or `null`.
  - `getProducts()`: resolves the session, then calls `fetchProducts(sets)` with `["public"]` or `["public", "authenticated"]`.
  - `getProductBySlug(slug)`: same session check. Returns the product, or signals "requires login" / "not found".
  - Both return each product as a `CatalogProduct` with its price, tier and `savingsPercent: number | null` resolved by the DAL (D-036).
- `savingsPercent` (D-036):
  - `Math.round((1 - memberPrice / everydayPrice) * 100)`, a whole number.
  - `null` when the tier is everyday (every product without a session), when the rounded value is 0 or less (member price not lower), or when the everyday price is 0.
  - Pages and components only render it; they never compute it and never receive the everyday price for a member-tier product. The logged-out render holds nothing derived from member prices.
- Price sort helper (D-038): a pure, server-only module in `src/lib/products/` (`import "server-only";`).
  - Sorts `CatalogProduct[]` by the price the visitor sees (the DAL-resolved price: everyday without a session, the member price for the tier with one, members-only products included in the same order), ascending or descending; equal prices fall back to name A–Z. No `sort`: the input order is returned unchanged. The input array is not mutated.
  - Computes, for a rendered list, the index order for each sort option (the sort island's only data).
  - The signed-out order uses nothing derived from member prices.
  - Pages call it; they never compare prices themselves.
- `fetchProducts(sets)` is **not exported**, uses `'use cache'` + `cacheLife(...)` + `cacheTag("products")`, and is keyed only by `sets` (never by cookie or user data).
- Source selection: all three `CONTENTFUL_*` vars set (non-empty) means the live adapter; otherwise the mock adapter. An empty string counts as unset. No override. One server log line names the active source. Both adapters apply the same visibility filter.
- Live adapter: `client.withoutUnresolvableLinks.getEntries({ content_type: "product", "fields.visibility[in]": sets.join(","), order: ["fields.name"] })`. Parse the result with `productCollectionSchema`.
- Live image URLs are protocol-relative (`//images.ctfassets.net/...`): prefix `https:`. Mock image URLs are `/products/<file>.svg`.

## Filtering and layout (D-019, D-038)

- State lives in URL search params: `category`, `q`, `layout` (`price` | `specs`), `sort` (`price-asc` | `price-desc`).
- The page awaits `searchParams`, validates them (unknown category/layout/sort values are ignored; no `sort` means name order), filters on the server, then sorts the filtered list with the price sort helper (Data access).
- Filter controls: search is `next/form` with GET (hidden inputs keep `category`, `layout` and `sort`); category chips are `<Link>`s that keep `q`, `layout` and `sort`. Clear Filters: `<Link href="/">` (drops `sort` too).
- Layout toggle: a client island flips `data-layout` on the grid wrapper and keeps the URL in sync. Its options are real links (keeping `q`, `category` and `sort`), so it still works without JS. Both card variants are server-rendered; Tailwind `group-data-[layout=specs]:` utilities switch columns, orientation and the visible spec block, and move the single price element with `order-*`. No refetch. Until the island exists (P05), the options are plain server links.
- Sort control: two options, price ascending (`price-asc`) and price descending (`price-desc`); none is active by default. A client island in `src/components/client/` renders them as real links (`?sort=price-asc` / `?sort=price-desc`, keeping `q`, `category` and `layout`), so it works without JS and the server-rendered order is already correct. With JS, a click reorders the real DOM children (the server-rendered cards) to that option's index order, so focus order follows, updates the URL with `history.replaceState`, and makes no request. Clicking the active option does nothing; there is no way to toggle a price sort off except Clear Filters (or editing the URL).
- Known limitation (D-038): a client-side sort or layout toggle rewrites the URL without a server render, so the server-rendered links are not updated. After a client-side sort, a chip click, a search or a layout toggle uses the `sort` value from the last server render; after a client-side layout toggle, a sort click writes the `layout` value from the last server render. Not fixed, for sort or for layout.

## Auth (D-012, D-017, D-032, D-034)

- Session cookie: named `session`, a jose HS256 JWT signed with `SESSION_SECRET` (required, at least 32 characters; session functions throw if it is missing or too short). Flags: `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, 7-day expiry. Payload holds only the display name and expiry.
- Login is a server action in `src/lib/auth/actions.ts`; it validates input with zod and re-checks the session itself. Logout is the `POST /logout` route handler, which calls `deleteSession()` from `src/lib/session.ts` (D-034).
- `proxy.ts` (Node runtime in Next 16) does optimistic redirects only. It is never the authorization check. Its matcher covers `/login` and `/products/:slug`:
  - `/login` with a valid session: 307 to `/`.
  - `/products/<slug>` without a valid session, when the slug is a Set B (`authenticated`) product: 307 to `/login?next=/products/<slug>`, before rendering (D-032). Public and unknown slugs pass through.
  - The proxy learns which slugs are Set B from a server-only helper in `src/lib/` that does not call Contentful on every request. The DAL still decides what a page receives.

## Error handling

- Missing product image: placeholder rendered by the card (the mock and live data both include `bubble-bath-whale` without an image).
- Product images are SVG: render with `next/image` and `unoptimized`; `next.config.ts` lists `images.ctfassets.net` in `images.remotePatterns`.
- Empty filter results: an empty state with a Clear Filters link.
- Unknown slug: `notFound()` with a route-level `not-found.tsx`.

## Tests (D-031, D-032, D-036, D-038)

- Unit tests are colocated `*.test.ts` files, run by Vitest in Node. `server-only` is aliased to an empty module in `vitest.config.mts`.
- Unit tests use the mock data and never touch the network.
- SSR checks (`scripts/verify-ssr.sh`, Playwright) run without `CONTENTFUL_*` vars so they get deterministic mock data. Because Next loads `.env.local` itself, the checks export the three vars as empty strings (Next never overwrites a var already in the environment) and set their own `SESSION_SECRET`.
- SSR checks assert both directions on the HTTP response body: Set B names, member prices and the savings line `You save 20%` present with a session, absent without one (D-036); everyday prices present without one (D-031). Streamed content counts, because it is in the same response; there are no streaming-wrapper, fallback-text or no-JS assertions.
- The Set B slug redirect is checked at the HTTP level: a logged-out request gets status 307 with `Location: /login?next=/products/<slug>` (D-032).
- Sign-out is checked at the HTTP level (`POST /logout` with a session: 303, `Location: /`, the `session` cookie cleared; a foreign `Origin`: 403) and in e2e (after Sign out, with no reload, no Set B name anywhere in the DOM) (D-034).
- Price sort (D-038): SSR checks that `/?sort=price-asc` and `/?sort=price-desc` render the cards in price order both signed out (everyday prices) and signed in (member prices, Set B included), and that an unknown `sort` renders name order. An e2e check that a sort click reorders the cards with no navigation and updates the URL.
- Layout shift: an e2e test measures Cumulative Layout Shift with a `PerformanceObserver` while the skeletons are replaced, and expects it to stay below 0.01 (D-031). It also covers a sorted URL (D-038).
