# Phase 04-fix1: Proxy redirect for members-only slugs (OI-1)

**Builder:** data-auth  ·  **Depends on:** phase 01 `bb5be94` (`src/lib/session.ts`: `SESSION_COOKIE`, `verifySessionToken`; `src/proxy.ts` matching `/login`), phase 02 `04e62d2` (`src/lib/products/source.ts` `getProductSource`; `src/lib/products/mock-adapter.ts` `fetchMockProducts(sets)`; `src/lib/products/contentful-adapter.ts` `fetchContentfulProducts(sets)`; `src/schemas/product.ts` `SLUG_PATTERN`, `ProductEntry`), phase 04 `9c79ec9` (wip, OI-1), docs `8a147c9` (D-031, D-032)  ·  **Written by:** orchestrator

## Goal

A logged-out request for a members-only (Set B) product URL gets a real server 307 from `src/proxy.ts` to `/login?next=/products/<slug>` before any rendering (D-032). This restores phase 04 R3 at the HTTP level and fixes R17 (signing in from that redirect lands on the product, not on `/`). The DAL stays the authorization check.

## Mock data used below (read-only; `src/data/products.mock.json`)

| Product | slug | Set |
|---|---|---|
| Forest Friends Activity Cube | `forest-friends-activity-cube` | **authenticated** |
| Cloud Bunny Plush | `cloud-bunny-plush` | public |
| (none) | `no-such-toy` | neither (matches `SLUG_PATTERN`, not in the data) |

The mock has 4 `authenticated` products; qa reads their slugs from the mock file.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | New file `src/lib/products/members-only.ts`, first line `import "server-only";`, exports `isMembersOnlySlug(slug)` and `MEMBERS_ONLY_SLUGS_TTL_MS` (Contract). `isMembersOnlySlug` resolves `true` exactly for slugs of `authenticated` products from the active source (`getProductSource()` → `fetchMockProducts(["authenticated"])` or `fetchContentfulProducts(["authenticated"])`), `false` for public slugs, unknown slugs, the empty string and any string that fails `SLUG_PATTERN` (those return `false` without fetching) | architecture.md Auth (D-032), Data access | unit |
| R2 | The helper keeps the Set B slug list in memory for `MEMBERS_ONLY_SLUGS_TTL_MS`. Within that window, any number of calls (sequential or concurrent) triggers at most one adapter fetch; after it expires, the next call fetches again. Each fetch that fills the cache logs exactly one line `[products] members-only slugs loaded: <n>` (`console.info`, `<n>` = number of slugs, never a slug, name or env value) | architecture.md Auth: "does not call Contentful on every request" (D-032) | unit |
| R3 | If the adapter fetch rejects, `isMembersOnlySlug` rejects too (no silent `false` cached), and the next call tries again | D-032 (proxy is optimistic; the proxy decides what to do with the error, R7) | unit |
| R4 | `src/proxy.ts`: a request to `/products/<slug>` with no valid `session` cookie (missing, garbage, expired, wrong secret, or under another cookie name) where `isMembersOnlySlug(slug)` is `true` returns a 307 whose `Location`, resolved against the request URL, is on the request origin, has pathname `/login`, and exactly one search param `next` whose decoded value is `/products/<slug>` | architecture.md Routes, Auth; D-018, D-032 | unit + verify-ssr |
| R5 | `src/proxy.ts`: `/products/<slug>` passes through (`NextResponse.next()`, no `Location`) when the session cookie is valid (then `isMembersOnlySlug` is not called at all), or when there is no valid session and `isMembersOnlySlug(slug)` is `false` (public, unknown, or pattern-failing slug) | architecture.md Auth (optimistic only); D-017 | unit |
| R6 | `/login` behaviour is unchanged: valid session → 307 to `/` on the request origin, ignoring `?next`; otherwise pass through; `isMembersOnlySlug` is never called for `/login` | architecture.md Routes, Auth; phase 01 R14/R15 | unit |
| R7 | If `isMembersOnlySlug` rejects inside the proxy, the proxy passes the request through (no 500, no redirect). The page's DAL check still protects the data | D-017 (DAL is the authorization check); D-032 | unit |
| R8 | `export const config = { matcher: ["/login", "/products/:slug"] }` (exactly this array) | architecture.md Auth (D-032) | unit |
| R9 | The proxy reads the session only from `request.cookies` through `verifySessionToken` (never `cookies()` from `next/headers`), and the slug only from `request.nextUrl.pathname` | phase 01 contract; proxy.md | unit + review |
| R10 | Against a production build (`scripts/verify-ssr.sh`): logged-out `GET /products/forest-friends-activity-cube` → status `307`, `Location` decodes to `/login?next=/products/forest-friends-activity-cube` (R4 rule), and the body contains none of the product name, `$89.00`, `$71.20` or its description (phase 04 R3 restored, leak guards kept). Logged-out `GET /products/cloud-bunny-plush` → 200 (unchanged R4 of phase 04). Logged-in `GET /products/forest-friends-activity-cube` → 200 with `$71.20` (unchanged R6 of phase 04) | phase 04 R3; D-018, D-032 | verify-ssr |
| R11 | Caching works inside the running proxy: verify-ssr sends at least 3 logged-out requests for a Set B slug to the production server, and the server log contains exactly one `[products] members-only slugs loaded:` line | D-032; human instruction ("must not call Contentful on every request") | verify-ssr |
| R12 | e2e R17 (`e2e/login.spec.ts`) passes: from `/products/forest-friends-activity-cube` logged out → `/login?next=…`; sign in → URL **pathname** is exactly `/products/forest-friends-activity-cube` (the line-22 check is anchored to the pathname, so `/login?next=/products/…` no longer matches), with `Member price`, `$71.20` and `Members only` visible; Sign out → `/` logged out | phase 04 R17; OI-1 | e2e |
| R13 | Every other existing check still passes (typecheck, lint, unit, client boundary, build, the rest of verify-ssr and e2e) | — | command |
| R14 | Builder changes limited to `src/proxy.ts` and the new `src/lib/products/members-only.ts`. Every other `src/lib/**` file, `src/app/**`, `src/components/**`, `.env.example`, `package.json` unchanged | agents/data-auth.md Paths; reviewer G1 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

```ts
// src/lib/products/members-only.ts
import "server-only";
export const MEMBERS_ONLY_SLUGS_TTL_MS: number; // 5 * 60 * 1000
export function isMembersOnlySlug(slug: string): Promise<boolean>;
```

```ts
// src/proxy.ts (unchanged signature)
export async function proxy(request: NextRequest): Promise<NextResponse>;
export const config = { matcher: ["/login", "/products/:slug"] };
```

- Redirect for R4: `NextResponse.redirect(url, 307)` where `url = new URL("/login", request.url)` and `url.searchParams.set("next", "/products/" + slug)`. The raw `Location` is therefore `…/login?next=%2Fproducts%2F<slug>`; checks compare the decoded `next` value, so either encoding passes.
- Log line (R2), exact prefix: `[products] members-only slugs loaded: ` followed by the count.
- Unit tests may reset the helper's cache with `vi.resetModules()` + re-import; no reset export is added.

### Contract decisions

- **Helper name and place:** `src/lib/products/members-only.ts`, next to the adapters it calls (data-auth's paths). It does not go through `dal.ts`: DAL functions resolve the session from `cookies()`, which the proxy must not call, and `fetchProducts` is not exported (architecture.md Data access).
- **In-memory TTL cache, 5 minutes:** a stale list only affects the optimistic redirect. A product newly moved to Set B is still protected by the DAL; a product newly made public may redirect logged-out visitors to `/login` for up to 5 minutes. R11 proves the cache survives across proxy invocations in `next start`.
- **Fail open (R7):** a lookup failure must not take product pages down; authorization stays in the DAL (D-017).
- **Session check first (R5):** logged-in requests never trigger the lookup.

## Owned paths

| Role | May change |
|------|------------|
| data-auth | `src/proxy.ts`, `src/lib/products/members-only.ts` (new) |
| qa | `src/proxy.test.ts`, `src/lib/products/members-only.test.ts` (new), `scripts/verify-ssr.sh`, `e2e/login.spec.ts` |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
npm run test:e2e
```

## Escalate (do not guess)

- If the bundled docs or a real `next start` show that the in-memory cache does not hold across proxy invocations (R11 fails, or `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` rules it out: it says Proxy "should not attempt relying on shared modules or globals"), stop and escalate with the evidence. Do not switch to another caching mechanism (`'use cache'` in the proxy, a build-time slug list, an env var) without a human decision.
- If R12 (R17) still fails after the proxy redirect works, escalate with the network trace; do not touch `src/app/**`.

## Out of scope

- `instant = false`, `<Suspense>`, skeletons (phase 07).
- Phase 04 R2/R16 HTTP 404 status (still JS-handled; `e2e/not-found.spec.ts` stays).
- Any change to `login()`, `dal.ts`, the adapters or the page.

## Where the instructions got in the way

- The human prompt says "data-auth names it in the spec", but qa writes tests from the spec before data-auth runs (D-025), so the orchestrator named the helper (Contract decisions).
- architecture.md says the helper "does not call Contentful on every request" but not how. `'use cache'` is a no-op under Vitest, and proxy.md warns against relying on module globals, so the spec picks an in-memory TTL cache and proves it against `next start` (R11) instead of trusting either.
