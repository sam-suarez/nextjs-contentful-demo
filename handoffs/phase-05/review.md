# Phase 05: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/components/client/layout-toggle.tsx:1 (`"use client";`), :40 `LayoutProvider`, :47 `LayoutGrid`, :65 `LayoutToggle`. No other `'use client'` added in the diff (page.tsx, filter-card.tsx, product-grid.tsx have none). The script output is for qa's command check. | |
| R2 | PASS | layout-toggle.tsx:40 (`{ layout: CatalogLayout; children: ReactNode }`), :47 (`{ children }`), :65 (`{ hrefs: Record<CatalogLayout, string> }`). Imports at :3-7 are only `next/link`, `next/navigation`, `react` and `@/components/catalog-params`. Nothing from `@/lib/**`. | |
| R3 | PASS | src/app/page.tsx:705-708 (a single `<LayoutProvider layout={params.layout}>` wraps FilterCard and grid/EmptyState). src/components/product-grid.tsx:935/942 `<LayoutGrid>` is the outer wrapper. layout-toggle.tsx:50 `<div data-layout={current} className="group">`. ProductCard is still rendered by the server ProductGrid as children (product-grid.tsx:938). EmptyState is not wrapped in LayoutGrid. verify-ssr.sh:637-646 checks this. | |
| R4 | PASS | filter-card.tsx:893-898 (`hrefs` built with `catalogHref({ category, q, layout: "price" / "specs" })`). Label and `role="group"` + `aria-labelledby="layout-label"` kept at :870-876. Muted track at :876. Option text at layout-toggle.tsx:13-14. Active styling at :809-811 (`min-h-12`, `border-2`, `border-foreground bg-card shadow-pop`) is unchanged from P03. | |
| R5 | PASS | layout-toggle.tsx:739-745 (`useMounted` returns server snapshot `false`). :799-801: before mount, only `aria-current="true"` on the active option, with no `role` or `aria-pressed`. :803-805 renders `<Link href={hrefs[...]}>`, which is an `<a>`. verify-ssr.sh:594-622 asserts this for all 15 catalog URLs. The P03 checks are not modified in the diff. | |
| R6 | PASS | layout-toggle.tsx:760-761: the server render parses `layout` from the request search params with `parseCatalogParams`, so `bogus` gives `price`. One `LayoutGrid` per page (product-grid.tsx:935). verify-ssr.sh:626-659 covers `/`, `/?layout=specs`, `/?layout=bogus` and logged-in `/?layout=specs`, including the Set B and member-price checks. | |
| R7 | PASS | layout-toggle.tsx:799-800: after mount, `role: "button"` and `aria-pressed: active` replace `aria-current`. The swap goes through `useSyncExternalStore` with server snapshot `false` (:740-744), so hydration matches the server HTML first and changes after. e2e/layout-toggle.spec.ts:213-254 tests this, including a hydration-error listener. | |
| R8 | PASS | layout-toggle.tsx:788-793: plain left click calls `preventDefault`, returns early if the option is already active, and otherwise calls `window.history.replaceState(null, "", hrefs[next])`. `prefetch={false}` at :806. The grid follows through `useSearchParams` (:760). e2e/layout-toggle.spec.ts:256-327 covers the bounding-box move, window marker, RSC requests, `replaceState` spy, no `pushState`, the reverse click and the active-option no-op. | |
| R9 | PASS | `hrefs` come from `catalogHref` with `category`/`q` (filter-card.tsx:894-897). e2e/layout-toggle.spec.ts:329-351 checks both URLs. | |
| R10 | PASS | layout-toggle.tsx:760-762: the current layout is read from `useSearchParams()` and parsed with `parseCatalogParams`. There is no local state seeded from the prop. e2e/layout-toggle.spec.ts:353-382 covers the Bath-chip example and its reverse. | |
| R11 | PASS | layout-toggle.tsx:775-777 (`isPlainLeftClick`: `button === 0` and no meta/ctrl/shift/alt key). :789 returns without `preventDefault` otherwise, so `next/link`'s default handling applies. | |
| R12 | PASS | e2e/layout-toggle.nojs.spec.ts:61-81: `/?layout=specs` has `data-layout="specs"`, `aria-current`, every price visible and the label below the `<h2>`. `/` shows prices. A real-link click on `/` goes to `/?layout=specs`. | |
| R13 | PASS | playwright.config.ts:415-426: `chromium` uses `testIgnore: /\.nojs\.spec\.ts$/`, and `chromium-no-js` uses `testMatch: /\.nojs\.spec\.ts$/` with `javaScriptEnabled: false`. The `webServer.env` blanking is unchanged (:432-437). | |
| R14 | PASS | No `<Suspense>` and no `loading.tsx` in the diff. page.tsx:688 keeps `export const instant = false`. verify-ssr.sh:448 says R14 is covered by the existing R18 loop, and the new fetches are added to `$FETCHED` (:553-555). The `ƒ` build output is for qa's command check. | |
| R15 | PASS | Files touched: layout-toggle.tsx (new), filter-card.tsx, product-grid.tsx, page.tsx (ui), and playwright.config.ts, e2e/layout-toggle.spec.ts, e2e/layout-toggle.nojs.spec.ts, scripts/verify-ssr.sh (qa). None of the forbidden paths appear. | |
| G1 | PASS | Same file list as R15. Every file is in the Owned paths table. | |
| G2 | PASS | The only `'use client'` is at src/components/client/layout-toggle.tsx:1. | |
| G3 | PASS | No `<Suspense>` or `loading.tsx` anywhere in the diff. | |
| G4 | PASS | No `NEXT_PUBLIC_` variables and no secrets in client code. playwright.config.ts:436 is a test-only `SESSION_SECRET` in the webServer env and was already there in P04. | |
| G5 | PASS | No new files under `src/lib/**`. | |
| G6 | PASS | Island props are layout/hrefs/children only (layout-toggle.tsx:40, :47, :65). Prices and products reach it only as server-rendered `children` (product-grid.tsx:935-942), which architecture.md allows. No `@/lib` import in the island. | |

Overall: PASS

Notes:
- layout-toggle.tsx:761: in the App Router `useSearchParams()` never returns null, so the `layout` prop fallback is effectively never used. The layout is always taken from the URL. This is consistent with R10 but leaves the prop redundant.
- layout-toggle.tsx:761 uses `searchParams.get("layout")`, which is the first value. I can't see whether the server's `parseCatalogParams` resolves a repeated `?layout=a&layout=b` the same way. If it doesn't, the server HTML and the hydrated state could disagree on that edge case. No requirement covers it; qa could add a quick probe.
- Hydrated options are `<a role="button">`. Keyboard activation is Enter only (link behavior), not Space as a native button would allow. The spec asks for `role="button"` as written, so this is a note, not a defect.

Where the instructions got in the way: The diff can't show the R1 `check-client-boundary.sh` output, the R14 `ƒ` build marker or the R7/R8 runtime behavior. I passed those on code evidence plus the qa-owned checks in the diff, and they rely on qa's command run.

**Orchestrator decision:** close
