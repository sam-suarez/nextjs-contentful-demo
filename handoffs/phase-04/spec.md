# Phase 04: Detail + login

**Builder:** ui  ·  **Depends on:** phase 01 (`bb5be94`: `src/lib/auth/next-path.ts` exports `safeNextPath`; `src/lib/auth/actions.ts` exports `login`, `logout`; session cookie `session`), phase 02 (`04e62d2`: `src/lib/dal.ts` exports `getProductBySlug`, `verifySession`; `ProductBySlugResult`; `CatalogProduct.priceTier`), phase 03 (`06d1f58`: `src/components/site-header.tsx` `SiteHeader`, `site-footer.tsx` `SiteFooter`, `price.tsx` `Price`, `product-image-frame.tsx` `ProductImageFrame`, `badge.tsx` `MembersOnlyBadge`, `format.ts` `formatPrice`, `catalog-params.ts` `catalogHref`, `categories.ts` `CATEGORY_META`/`categoryLabel`, `ui-classes.ts` tokens, `globals.css` design tokens)  ·  **Written by:** orchestrator

## Goal

`/products/[slug]` renders the product detail screen fully on the server (found / redirect-to-login / 404), `/login` renders the sign-in form with its `?error=missing` alert and redirects an already-logged-in visitor to `/`, and a route-level `not-found.tsx` renders the "can't find that toy" screen. Every byte depends only on the DAL result already computed server-side; nothing streams.

## Mock data used below (read-only; `src/data/products.mock.json`)

| Product | slug | Set | Category | ageRange | material | Everyday → Member |
|---|---|---|---|---|---|---|
| Bubble Bath Whale (no image) | `bubble-bath-whale` | public | bath | 6 months+ | BPA-free vinyl | $14.00 → $11.20 |
| Cloud Bunny Plush | `cloud-bunny-plush` | public | plush | 0 months+ | Organic cotton, polyester fill | $28.00 → $22.40 |
| Forest Friends Activity Cube | `forest-friends-activity-cube` | **authenticated** | activity-sensory | 12 months+ | Birch plywood, non-toxic finish | $89.00 → $71.20 |

`forest-friends-activity-cube` features (in order): "Bead maze top", "Five activity sides", "Gears, spinners and shape slides", "Heirloom quality". A slug matching `SLUG_PATTERN` but absent from the data (e.g. `no-such-toy`) does not exist in either set.

**HTML escaping** (React): `'` → `&#x27;`. Only one new string this phase contains an apostrophe: "We can't find that toy" → `We can&#x27;t find that toy`. Every other new string below has none.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `src/app/products/[slug]/page.tsx` exports `const instant = false` and a default async page. It awaits `props.params`, calls `getProductBySlug(slug)` from `@/lib/dal` (its only data call on this page — no `verifySession()` here), and branches on `.status`: `"not-found"` → `notFound()`; `"requires-login"` → `redirect("/login?next=/products/" + slug)`; `"found"` → render the detail screen from `.product`. It infers logged-in state from `product.priceTier`, never by re-reading the session | architecture.md Routes, Server/client boundary, Data access; D-017, D-018, D-020; STATE.md P02 contract note (DAL resolves the price) | review + verify-ssr |
| R2 | Unknown slug (`/products/no-such-toy`): response status 404, and the body matches R16 (not-found screen). A slug that fails `SLUG_PATTERN` (e.g. contains `%2F` or uppercase) also 404s, because `getProductBySlug` returns `"not-found"` for it | architecture.md Routes; D-018 | verify-ssr |
| R3 | `/products/forest-friends-activity-cube` with no `session` cookie: a 307 response with header `Location: /login?next=/products/forest-friends-activity-cube`, and no product data (name, price or description) anywhere in the response body | architecture.md Routes; D-018; `next/navigation` `redirect` (default 307 outside a Server Action) | verify-ssr |
| R4 | `/products/cloud-bunny-plush`, no cookie: status 200; contains `Cloud Bunny Plush`, the description, `Organic cotton, polyester fill` and `0 months+`; `>Everyday price<` once, `$28.00` once; no `>Member price<`, no `$22.40`, no `>Members only<`; contains a secondary button `Sign in for member pricing` linking to `href="/login?next=/products/cloud-bunny-plush"` and the sentence `Members get lower prices on every toy.` | design.md Screens (Product detail) | verify-ssr |
| R5 | `/products/cloud-bunny-plush` with a valid session cookie: status 200; `>Member price<` once in `accent-strong`, `$22.40` once; no `>Everyday price<`, no `$28.00`, no `Sign in for member pricing` row | design.md Screens (Product detail): "Logged in: … no sign-in row" | verify-ssr |
| R6 | `/products/forest-friends-activity-cube` with a valid session cookie: status 200; contains `Forest Friends Activity Cube`, `>Member price<`, `$71.20`, and exactly one `>Members only<` badge rendered next to the `<h1`; `<h1` occurs exactly once and its text is the product name | design.md Screens (Product detail): "A members-only product shows the Members only badge next to the h1" | verify-ssr |
| R7 | Breadcrumb above the title: `Catalog` (a `<Link href="/">`), then the category label (a `<Link>` to `catalogHref({ category: product.category })`, i.e. `href="/?category=plush"` for Cloud Bunny Plush), then the product name as plain text (no link). For Cloud Bunny Plush the rendered text reads `Catalog / Plush / Cloud Bunny Plush` in that order | design.md Screens (Product detail) | verify-ssr |
| R8 | Image: `<ProductImageFrame shape="blob" image={product.image} name={product.name} category={product.category} />` (blob radius, dot backdrop tinted by category colour); for `bubble-bath-whale` (`image: null`) the placeholder (`Picture coming soon`, no `<img>`) renders instead. Above the title: a category icon circle (2px `foreground` border, `CATEGORY_META[category].color` fill, the category icon) immediately followed by the uppercase category label | design.md Screens (Product detail), Components (Image frame, Image placeholder, Icon circle) | verify-ssr + review |
| R9 | Details block: a row `Age range` → `product.ageRange` and a row `Material` → `product.material`, same label text as the card's specs-first rows (`src/components/product-card.tsx`) | design.md Screens (Product detail) | verify-ssr |
| R10 | "What makes it special" section: heading `What makes it special`, then one list item per `product.features` entry, each with a check icon (`lucide-react`) in a `quaternary` (mint) circle. The whole section (heading + list) is omitted when `product.features.length === 0`. Cloud Bunny Plush and Forest Friends Activity Cube (non-empty `features`) render it; a product built with `features: []` would not | design.md Screens (Product detail): "The features list is omitted when features is absent"; `src/lib/products/types.ts` `features: string[]` (`[]` when none) | verify-ssr + review |
| R11 | A text link `Back to catalog` at the bottom of the detail screen, `href="/"` | design.md Screens (Product detail) | verify-ssr |
| R12 | `src/app/login/page.tsx` exports `const instant = false` and a default async page. It awaits `props.searchParams`, calls `verifySession()` (`@/lib/dal`), and `redirect("/")` when a session exists — before rendering the form | architecture.md Routes: "Logged-in visitors are redirected to /"; Server/client boundary | verify-ssr + review |
| R13 | `/login` renders `<SiteHeader variant="minimal" />`, an `<h1>Sign in</h1>`, the sentence `Sign in to see member prices and members-only toys.`, the sentence `This is a demo, so any username and password work.`, a `<form action={login}>` (`login` from `@/lib/auth/actions`) with a labelled `username` input (`placeholder="demo"`, `required`) and a labelled `password` input (`type="password"`, `placeholder="Any password"`, `required`), a full-width primary submit button `Sign in`, and a text link `Continue browsing without signing in` to `/`. `>Sign in<` occurs exactly twice (the `h1` and the submit button) | design.md Screens (Login) | verify-ssr |
| R14 | The page reads `next` from `searchParams` through `safeNextPath` (`@/lib/auth/next-path`) before using it anywhere. When the sanitised value is non-null, the form has a `<input type="hidden" name="next" value="<that value>">` and the "Continue browsing without signing in" link stays `href="/"` (declining sign-in never forwards `next`). When it is null (missing or unsafe), no hidden `next` input is rendered | architecture.md Routes: `next` validated as a same-origin relative path; `src/lib/auth/next-path.ts` contract | verify-ssr + review |
| R15 | `/login?error=missing`: an alert (`role="alert"`) containing the exact text `Enter a username and password to sign in.`, positioned above the form fields. `/login` with no `error` param, or `error` set to any other value: no element with `role="alert"` | design.md Screens (Login); architecture.md Routes | verify-ssr |
| R16 | `src/app/products/[slug]/not-found.tsx` is a default-exported component taking no props. It renders `<SiteHeader variant="minimal" />`, a pill badge (`bg-tertiary`) reading `404`, `<h1>We can&#x27;t find that toy</h1>`, the sentence `It may have been renamed or put back in the toy box.`, and a primary button `Back to catalog` linking to `/` | design.md Screens (Not found); `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md` (no props) | verify-ssr + review |
| R17 | End-to-end (`e2e/login.spec.ts`, Playwright, JS enabled): starting at `/products/forest-friends-activity-cube` with no session, the browser is redirected to `/login?next=%2Fproducts%2Fforest-friends-activity-cube` (or the unencoded equivalent); filling `username`/`password` with any non-empty values and submitting lands back on `/products/forest-friends-activity-cube` showing `Member price` and `$71.20` and the `Members only` badge; clicking `Sign out` returns to `/` logged out | STATE.md Phase plan (P04 qa row): "e2e: login → Set B visible → logout"; D-018 (`next` round trip) | e2e |
| R18 | `playwright.config.ts` exists at the repo root, `test:e2e` (`playwright test`) runs it, and its `webServer` blanks `CONTENTFUL_SPACE_ID`/`CONTENTFUL_ENVIRONMENT`/`CONTENTFUL_DELIVERY_TOKEN` and sets its own `SESSION_SECRET`, the same env pattern as `scripts/verify-ssr.sh` | agents/qa.md Hard rules; architecture.md Tests | command |
| R19 | No `'use client'` is added anywhere this phase and `src/components/client/` is not created; `scripts/check-client-boundary.sh` still prints `OK: client boundary respected` | architecture.md Server/client boundary; D-022 | command + review |
| R20 | The builder's changes are limited to the files under Owned paths. `src/lib/**`, `src/schemas/**`, `src/data/**`, `public/**`, `src/proxy.ts`, `.env.example`, `next.config.ts`, `package.json`, and every P03 file (`src/app/page.tsx`, `src/app/layout.tsx`, existing `src/components/*`) are unchanged | agents/ui.md Paths; reviewer G1 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. All imports use the `@/` alias.

```tsx
// src/app/products/[slug]/page.tsx
export const instant = false;
export default async function ProductPage(props: PageProps<"/products/[slug]">): Promise<JSX.Element>;
```

Flow: `const { slug } = await props.params;` → `const result = await getProductBySlug(slug);` (`@/lib/dal`) → switch on `result.status` per R1. Never call `verifySession()` on this page.

```tsx
// src/app/products/[slug]/not-found.tsx
export default function ProductNotFound(): JSX.Element;   // no props
```

```tsx
// src/app/login/page.tsx
export const instant = false;
export default async function LoginPage(props: PageProps<"/login">): Promise<JSX.Element>;
```

Flow: `const { next: rawNext, error } = await props.searchParams;` → `const next = safeNextPath(rawNext);` (`@/lib/auth/next-path`) → `const session = await verifySession();` (`@/lib/dal`) → `if (session) redirect("/");` → render the form (`action={login}` from `@/lib/auth/actions`), hidden `next` input only when `next !== null`, alert only when `error === "missing"`.

New shared component:

```tsx
// src/components/alert.tsx
export function Alert(props: { children: React.ReactNode }): JSX.Element;
// role="alert", 2px foreground border, bg-secondary/20, rounded-lg (design.md Components: Alert)
```

Reused as-is, no signature change: `SiteHeader`, `SiteFooter`, `Price`, `ProductImageFrame`, `MembersOnlyBadge`, `formatPrice`, `catalogHref`, `CATEGORY_META`, `categoryLabel`, `BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `TEXT_LINK`, `LABEL`, `CONTAINER`, `COLOR_CLASSES`.

### Rendered strings (copied from `docs/design.md`; source text, before HTML escaping)

- Detail: `Members get lower prices on every toy.`, `Sign in for member pricing`, `Age range`, `Material`, `What makes it special`, `Back to catalog`.
- Login: `Sign in` (h1 and button), `Sign in to see member prices and members-only toys.`, `This is a demo, so any username and password work.`, `Enter a username and password to sign in.`, `Continue browsing without signing in`.
- Not found: `404`, `We can't find that toy`, `It may have been renamed or put back in the toy box.`, `Back to catalog`.

### Contract decisions

Choices architecture.md and design.md leave open, made by the orchestrator for this phase:

- **`not-found.tsx` is route-level** (`src/app/products/[slug]/not-found.tsx`), not a global 404: only this route needs toy-specific copy, and no other route calls `notFound()` yet.
- **The detail page never calls `verifySession()`.** It derives logged-in state from `product.priceTier`, which the DAL already set from the session (STATE.md P02 note: "pages never pick a price"). This also means the detail page makes exactly one DAL call.
- **The breadcrumb's category link reuses `catalogHref({ category })`** (`@/components/catalog-params`) rather than a hand-built string, so it's byte-identical to the catalog's own category chip URLs.
- **`Alert` is a new, small, reusable component** (`src/components/alert.tsx`) rather than inlined markup, matching how `Price`/`Badge` were factored in P03; nothing outside `/login` needs it yet.
- **The icon-circle-plus-label row above the detail title has no exported name.** It's the same visual pattern as the specs-first card's category row (`src/components/product-card.tsx`), inlined here since no test or later phase calls it by name.
- **`/login`'s own redirect-when-logged-in always targets `/`, never `next`.** architecture.md Routes states this explicitly ("Logged-in visitors are redirected to /"); only the *un-authenticated* paths through `/login` (hidden input, post-login redirect in `login()`) use `next`.

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/app/products/[slug]/page.tsx`, `src/app/products/[slug]/not-found.tsx`, `src/app/login/page.tsx`, new files under `src/components/` (not `src/components/client/`) |
| qa | `scripts/verify-ssr.sh` (extend), `playwright.config.ts` (new), `e2e/**` (new) |

`package.json` changes allowed: none. `@playwright/test` is already a `devDependency` and `test:e2e` already runs `playwright test` (P01 defaults); qa runs `npx playwright install chromium` once, before `test:e2e` exists as a real check.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
npx playwright install chromium   # once, before test:e2e
npm run test:e2e
```

If the build reports runtime data accessed outside `<Suspense>` on either new page, the fix is `instant = false` (already specified), never `<Suspense>` (D-020). If a check needs a change to `src/lib/**` (for example a new DAL helper), escalate: that file belongs to data-auth.

## Out of scope

- The P05 layout-toggle client island and anything under `src/components/client/`.
- Any change to `/` (catalog page), `src/app/layout.tsx`, or any P03 component's exported signature.
- Any change to `src/lib/**`, `src/schemas/**`, `src/data/**`, `public/**`, `src/proxy.ts`, `.env.example`, `next.config.ts`.
- A `/logout` route: logout stays a server action (architecture.md Routes).
- JS-disabled Playwright project (D-009's no-JS run is exercised by the human-check manual step this phase, same as P03; a dedicated no-JS Playwright project arrives with the P05 island, whose whole point is behavior that differs with JS on vs off).

## Amendments (round 2, human decision 2026-10-20)

These override the rows above where they conflict.

- **R4 / R5:** drop the assertions "`$28.00` occurs exactly once" (R4) and "`$22.40` occurs exactly once" (R5). Next repeats every rendered string in the hydration flight payload, with `$` escaped as `$$`, so a bare price string always matches more than once. Price presence and absence stay as they are: R4 needs `$28.00` present and `$22.40` absent; R5 needs `$22.40` present and `$28.00` absent. The exact-once count applies only to the bracketed labels (`>Everyday price<`, `>Member price<`), as in P03.
- **R1 (contract flow):** the page may call `await connection()` (`next/server`) as its first statement, before `await props.params`. This is the round-2 experiment for the escalation: it marks the page as request-time so `/products/[slug]` builds as `ƒ` (fully dynamic), not `◐`, and `redirect()` / `notFound()` produce real 307 / 404 statuses. The page still never calls `verifySession()`, and the rest of R1 is unchanged.
- **Escalate again** if the build still marks `/products/[slug]` as `◐`, or if R2, R3 or R16 still fail after the change. Do not try other workarounds (`<Suspense>`, `loading.tsx`, a DAL change, proxy changes). The next fallback is a proxy-based design, which needs human approval first.

## Amendments (round 3, human decision 2026-10-20)

These override the rows above and the round-2 amendments where they conflict. The human accepts that `/products/[slug]`'s `requires-login` and `not-found` branches are carried out by client-side JS. Under Cache Components the route builds `◐`, so the server can't send their 307 / 404 status. No proxy change, no `generateStaticParams`, no further server-side workaround.

- **R2 / R3 / R16 (server response):** drop the checks on HTTP status (`404`, `307`), the `Location` header, and the not-found screen as real server HTML. Keep the data-leak guard: a logged-out request to `/products/forest-friends-activity-cube` must not contain the product's name, `$71.20`, `$89.00` or its description anywhere in the response body, including the flight payload. The redirect, the 404 and the R16 screen are verified with JS enabled (e2e) and by review of `page.tsx` / `not-found.tsx`.
- **R2 / R16 (e2e, new):** with JS enabled, `/products/no-such-toy` shows the R16 screen (`404` pill, the `We can't find that toy` h1, the `Back to catalog` button to `/`).
- **R17 is unchanged.** It is the JS path the human is now relying on, so it must pass.
- **R1:** the `await connection()` added in round 2 may stay. It has no effect either way.
- `docs/architecture.md` (Server/client boundary, `instant = false`) and `agents/ui.md` are now inaccurate for this route. Correcting them is a human follow-up; no agent edits them.

## Where the instructions got in the way

- design.md's detail screen shows an icon-circle-plus-label row above the title but doesn't name a component for it (unlike `Price`, `Badge`, `ProductImageFrame`, which are explicit). Resolved in Contract decisions by inlining it, matching the un-named card-row precedent from P03.
- design.md doesn't say whether `/login`'s own "already logged in" redirect should preserve `next`; architecture.md Routes settles it as a plain redirect to `/`, so the spec follows architecture.md over a literal reading of the login screen's wireframe (which doesn't show this case at all).
