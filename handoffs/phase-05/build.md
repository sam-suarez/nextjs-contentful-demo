# Phase 05: Build (ui, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/components/client/layout-toggle.tsx` | created: line 1 `"use client";`. It exports `LayoutProvider`, `LayoutGrid` and `LayoutToggle`. A context shares the current layout. `LayoutProvider` derives the layout from `useSearchParams()` (`parseCatalogParams({ layout })`, so `"specs"` only for exactly `specs`) and falls back to the `layout` prop when that returns null. It renders no DOM of its own. `LayoutGrid` renders `<div data-layout={current} className="group">{children}</div>`. `LayoutToggle` renders two `next/link` `<a>`s (`prefetch={false}`) with `href={hrefs[value]}` and the P03 segmented classes. Before mount (server render and hydration) they carry `aria-current="true"` on the active one. After mount (`useSyncExternalStore` with server snapshot `false`) they carry `role="button"` + `aria-pressed` and no `aria-current`. A plain primary click with no modifiers calls `preventDefault`. If the option is not already active, it then calls `window.history.replaceState(null, "", hrefs[next])`. Modifier or non-primary clicks are not intercepted. Imports: `next/link`, `next/navigation`, `react`, `@/components/catalog-params` only | R1, R2, R7, R8, R9, R10, R11 |
| `src/components/filter-card.tsx` | edited: removed `LAYOUT_OPTIONS` and the P03 layout links. The `role="group"` + `aria-labelledby="layout-label"` track now contains `<LayoutToggle hrefs={{ price: catalogHref({category,q,layout:"price"}), specs: catalogHref({category,q,layout:"specs"}) }} />`. The `Layout` label, track styling, chips, search and Clear filters are unchanged | R4, R5 |
| `src/components/product-grid.tsx` | edited: the outer wrapper is now `<LayoutGrid>`. The `layout` prop is removed. Cards stay server components passed as children | R3 |
| `src/app/page.tsx` | edited: wraps `FilterCard` and the grid/empty state in one `<LayoutProvider layout={params.layout}>`. `instant = false` is kept. There is no Suspense and no loading.tsx | R3, R6, R14 |

## Fixes this round

none

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`, tsc clean |
| `npm run lint` | PASS | eslint, no output |
| `npm test` | PASS | `Tests 305 passed (305)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` (CONTENTFUL_* blank) | PASS | `ƒ /`, `ƒ /login`, `◐ /products/[slug]`. No Suspense / runtime-data error from `useSearchParams` |
| `scripts/verify-ssr.sh` (`VERIFY_SSR_SKIP_BUILD=1`, after the build above) | PASS | `verify-ssr: 551 passed, 0 failed` / `PASS` |
| `npm run test:e2e` | PASS (known failure only) | `16 passed, 1 failed`. The only failure is `[chromium] e2e/login.spec.ts R17` (OI-1, known, not gating). All R7–R10, R12 and R13 tests in both projects pass |

## Open issues

- The R17 known failure (OI-1) is unchanged and out of scope.
- `useSearchParams` in `LayoutProvider` relies on `/` being dynamic (`instant = false`). The build accepted it without a `<Suspense>` boundary. If `/` were ever made prerenderable, Next would demand a Suspense boundary here, which D-020 forbids. Keep `instant = false`.
- I chose `next/link` with `prefetch={false}` for the options. The server HTML is identical to P03, and the island adds no prefetch RSC traffic. Next's Link skips navigation when `onClick` calls `preventDefault` (`e.defaultPrevented` check in `next/dist/client/app-dir/link.js`).

## Where the instructions got in the way

- The spec's Contract decisions already note that the chips, the hidden `layout` search input and Clear filters keep their server hrefs after a JS toggle. I implemented it that way and changed nothing else.
- The `useSearchParams` docs recommend a `<Suspense>` boundary for prerendered routes. That does not apply on a dynamic route, and the build confirmed it, so no escalation was needed.
