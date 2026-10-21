# Phase 07: Suspense skeletons

**Builder:** ui  ·  **Depends on:** phase 03 `06d1f58` (catalog components), 04 `9c79ec9` (detail, login, not-found), 05 `f7dff1f` (`src/components/client/layout-toggle.tsx`: `LayoutProvider`, `LayoutGrid`, `LayoutToggle`, reads `useSearchParams()`), 04-fix1 `5f15cd8` (proxy 307 for logged-out Set B slugs and for `/login` with a session), docs `8a147c9` (D-031)  ·  **Written by:** orchestrator

## Goal

No route exports `instant = false`. Every part of `/`, `/products/[slug]`, `/login` and the session header that reads request data (the session through the DAL, `searchParams`) renders inside an explicit `<Suspense>` whose fallback is a layout-matched skeleton, so swapping the skeleton for the real content causes no layout shift (D-031). Prices and Set B still render only in server components and are still in the HTTP response body in both directions. The checks D-031 drops (streaming-wrapper / fallback-text assertions, the JS-disabled Playwright project) are removed.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | No file under `src/` exports `instant` (`grep -rn "export const instant" src` finds nothing) and no `loading.tsx` exists under `src/app` | D-031; architecture.md Server/client boundary | command + review |
| R2 | New `src/components/skeletons.tsx` (server component module, no `'use client'`) exports the five skeletons in the Contract. Each root element has `aria-busy="true"` and its `data-skeleton` value; every block inside is `aria-hidden="true"`. A skeleton contains no text nodes, no headings, no links, buttons, forms or images, no `data-layout` attribute, and never receives product, price or session data as props (they take no props) | design.md Components (Skeleton); D-031 | review |
| R3 | Pulse: skeleton blocks use a CSS pulse animation defined in `src/app/globals.css`, switched off under `@media (prefers-reduced-motion: reduce)`. Blocks use the `muted` token (`bg-muted`), `rounded-md` (pill where the real element is a pill) | design.md Components (Skeleton), Motion | review |
| R4 | Site header (`SiteHeader variant="session"`): the logo and the header frame render outside Suspense; only the session controls (Sign in button vs Member pricing badge + "Signed in as" + Sign out form) sit inside `<Suspense fallback={<HeaderSessionSkeleton />}>`. The `minimal` variant is unchanged and has no Suspense | architecture.md Server/client boundary; design.md Page shell | review + e2e (R10) |
| R5 | `/`: the page shell (header frame, `TitleArea`, container, footer) renders outside Suspense. The banner sits inside `<Suspense fallback={<BannerSkeleton />}>`. The filter card and the product grid / empty state (everything that reads `searchParams` or the product list, including the count and the `LayoutProvider` island, which calls `useSearchParams()`) sit inside `<Suspense fallback={<CatalogSkeleton />}>` | architecture.md Server/client boundary, Filtering and layout; D-031 | review + verify-ssr + e2e |
| R6 | `/products/[slug]`: the header frame is outside Suspense (session controls per R4). Everything that depends on `params` and `getProductBySlug` (breadcrumb, image, title, price card, details, features, back link, and the `redirect()` / `notFound()` branches) sits inside `<Suspense fallback={<ProductDetailSkeleton />}>`. The page never calls `verifySession()` (unchanged P04 rule) | architecture.md Routes, Server/client boundary; D-031 | review + verify-ssr + e2e |
| R7 | `/login`: the `minimal` header and the page frame (container, confetti) are outside Suspense. The login card (reads `searchParams` for `next` / `error` and `verifySession()` for the already-signed-in redirect) sits inside `<Suspense fallback={<LoginCardSkeleton />}>`. Copy, form fields, hidden `next` input, alert and the "Continue browsing" link are unchanged | architecture.md Routes; design.md Screens (Login); D-031 | review + verify-ssr |
| R8 | Each skeleton has the same outer size as the content it replaces at the default Playwright desktop viewport (1280×720) and at 375 px width: same container, card frame (border, radius, padding), grid columns and gaps, row heights and min heights. `CatalogSkeleton` covers the filter card plus a grid of placeholder cards with the price-first card dimensions | design.md Components (Skeleton) | e2e (R10) + review |
| R9 | Prices, Set B products and session-derived content still render only in server components; no client island receives them (unchanged G6); the layout island receives only the layout and server-rendered `children` | architecture.md Server/client boundary; D-019, D-022 | command (`scripts/check-client-boundary.sh`) + review |
| R10 | e2e (new `e2e/layout-shift.spec.ts`): a `PerformanceObserver` for `layout-shift` entries (`buffered: true`, ignoring entries with `hadRecentInput`), installed before navigation, sums the shift values while each page loads and its skeletons are replaced. For `/`, `/?category=bath` and `/products/cloud-bunny-plush`, each both logged out and logged in, the total is **below 0.01**. After load, no `[aria-busy="true"]` element remains in the visible page and the real content (page `h1`/product name, a price label) is visible | D-031; architecture.md Tests | e2e |
| R11 | Both directions on the HTTP response body still hold (existing verify-ssr checks kept): logged out, the catalog and detail bodies contain everyday prices and no Set B names or member prices; logged in, they contain Set B names and member prices and no everyday prices. Filtered URLs still render filtered content in the body. Streamed content counts as present | architecture.md Tests; D-031; assessment Part 1 item 3 | verify-ssr |
| R12 | D-031-dropped checks are removed, and only those: in `scripts/verify-ssr.sh`, every assertion on `<div hidden id="S:`, `<!--$?-->`, `<template id="B:` and fallback / "Loading" text; in Playwright, the `chromium-no-js` project in `playwright.config.ts` and `e2e/layout-toggle.nojs.spec.ts`. Every other check in those loops and files stays | D-031; agents/qa.md | review (qa diff) |
| R13 | The other existing checks still pass: unit tests, the rest of verify-ssr (P03/P04/P05/P04-fix1 content checks, exact-count label checks such as `>Sign in<` twice on `/login`, one `<h1` on the detail page, one `data-layout` wrapper), and the JS-enabled e2e suite (layout toggle, login R17, not-found) | — | command + verify-ssr + e2e |
| R14 | Builder changes limited to `src/app/**` and `src/components/**` (incl. `client/` only if `LayoutProvider` needs no prop change). No `src/lib/**`, `src/proxy.ts`, `next.config.ts`, `package.json` change | agents/ui.md Paths; reviewer G1 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

```tsx
// src/components/skeletons.tsx (server components, no props)
export function HeaderSessionSkeleton(): JSX.Element; // root data-skeleton="header-session"
export function BannerSkeleton(): JSX.Element;        // root data-skeleton="banner"
export function CatalogSkeleton(): JSX.Element;       // root data-skeleton="catalog"  (filter card + grid)
export function ProductDetailSkeleton(): JSX.Element; // root data-skeleton="product-detail"
export function LoginCardSkeleton(): JSX.Element;     // root data-skeleton="login-card"
// every root: aria-busy="true"; every inner block: aria-hidden="true"
```

- Unchanged signatures: `SiteHeader({ variant })`, page default exports, `ProductNotFound()`, `LayoutProvider` / `LayoutGrid` / `LayoutToggle`.
- Strings: none new. The skeletons render no text, so no "Loading" copy appears anywhere.
- e2e logged-in state: qa may mint the `session` cookie with jose and the Playwright `webServer` `SESSION_SECRET`, or sign in through `/login`. Either is fine.

### Contract decisions

- **One module for all skeletons** (`src/components/skeletons.tsx`): qa and the reviewer find them in one place; each is small.
- **`data-skeleton` markers** so the reviewer and e2e can find a skeleton without relying on class names.
- **No `data-layout` on `CatalogSkeleton`**: P05's verify-ssr check expects exactly one `data-layout` element (the real grid wrapper).
- **Banner in its own boundary**: its sentence depends on the session; the title area between banner and catalog stays static.
- **Logged in and logged out both measured for CLS**: the header session controls differ in width by state.

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/app/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/login/page.tsx`, `src/app/globals.css`, `src/components/**` (new `skeletons.tsx`; `site-header.tsx`; any component split needed to place a boundary) |
| qa | `scripts/verify-ssr.sh`, `playwright.config.ts`, `e2e/layout-toggle.nojs.spec.ts` (delete), `e2e/layout-shift.spec.ts` (new) |

`package.json` changes allowed: none.

**Test removals are human-authorized** (prompt for this thread, 2026-10-20): removing the R12 checks is a D-031 decision, not a weakened test. If the permission system denies a removal, do not retry and do not route around it (no other tool, no rewrite that keeps the same effect): stop, record it under "Open issues" in `qa.md`, and return.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
npm run test:e2e
grep -rn "export const instant" src ; find src/app -name 'loading.tsx'   # both empty (R1)
```

## Out of scope

- OI-2 (hidden previous route after sign-out).
- HTTP 404 status for unknown slugs (still JS-handled; `e2e/not-found.spec.ts` stays).
- Any proxy, DAL or session change.
- Changing copy, layout or the layout-toggle behaviour.

## Where the instructions got in the way

- The human's list names skeletons for "the catalog grid and count, the session part of the header, and the detail page body". Removing `instant = false` also forces `/login` (reads `searchParams` + session), the banner (session) and the filter card (`searchParams`, including the `useSearchParams()` island) behind a boundary, so Step A's design.md Skeleton entry and this spec add those. Flagged for the human check.
