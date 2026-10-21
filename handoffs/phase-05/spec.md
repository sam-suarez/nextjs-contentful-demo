# Phase 05: Layout toggle

**Builder:** ui  ·  **Depends on:** phase 03 (`06d1f58`: `src/components/filter-card.tsx` `FilterCard` with the P03 layout links, `src/components/product-grid.tsx` `ProductGrid` (wrapper with `data-layout` + `group`), `src/components/product-card.tsx` (`group-data-[layout=specs]:` utilities, price moved with `order-*`), `src/components/catalog-params.ts` `LAYOUTS`, `CatalogLayout`, `parseCatalogParams`, `catalogHref` (isomorphic, may be imported by the island)), phase 04 (`9c79ec9`, wip: `playwright.config.ts`, `e2e/**`; R17 known-failing, see "Known failure")  ·  **Written by:** orchestrator

## Goal

On `/`, the "Price first" / "Specs first" control becomes a client island. With JS it switches the grid between the two server-rendered card layouts instantly (no navigation, no refetch), keeps the URL in sync with `history.replaceState`, and exposes `aria-pressed`. Without JS it is the same pair of real links as in P03. Cards, prices and Set B stay server components. Playwright gains a JS-disabled project.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | New file `src/components/client/layout-toggle.tsx`, first line `"use client";`, exporting `LayoutProvider`, `LayoutGrid` and `LayoutToggle` (Contract). It is the only file in `src/` with `'use client'`; `scripts/check-client-boundary.sh` prints `OK: client boundary respected` | architecture.md Directory layout, Server/client boundary; D-022 | command + review |
| R2 | Island props carry UI state only: `LayoutProvider` gets `layout: CatalogLayout` and `children`; `LayoutGrid` gets `children`; `LayoutToggle` gets `hrefs: Record<CatalogLayout, string>`. No prop holds a price, a product, a product list, Set B data or session data. The file imports nothing from `@/lib/**` (type-only imports included) and nothing from `@/components/**` except `@/components/catalog-params` | architecture.md Server/client boundary; D-019; `.claude/rules/client-islands.md` | review |
| R3 | `src/app/page.tsx` wraps the filter card and the grid/empty-state in one `<LayoutProvider layout={params.layout}>`. `ProductGrid`'s outer wrapper is now `<LayoutGrid>`, which renders exactly `<div data-layout={current} className="group">{children}</div>` (the class may include more utilities; `group` and `data-layout` must be on this element). `ProductCard` (and every card, price and badge) stays a server component passed as `children`. The empty state still renders no element with `data-layout` | architecture.md Filtering and layout; design.md Filtering and layout controls (P05); P03 R24, R30 | review + verify-ssr |
| R4 | `FilterCard` renders `<LayoutToggle hrefs={{ price: catalogHref({ category, q, layout: "price" }), specs: catalogHref({ category, q, layout: "specs" }) }} />` in place of the P03 `LAYOUT_OPTIONS` links, with the label `Layout` kept outside or inside it, still associated (`role="group"` + `aria-labelledby`). Option text stays exactly `Price first` / `Specs first`; segmented-control styling as in P03 (pill track in `muted`, active option white with 2px `foreground` border and `shadow-pop`, `min-h-12`) | design.md Components (Segmented control), Filtering and layout controls | review |
| R5 | **Server HTML unchanged for no-JS clients.** For every catalog URL, the server HTML of the layout control is two `<a>` elements with `href` = `hrefs.price` / `hrefs.specs`, the active one (from the server-validated layout) with `aria-current="true"`, and **no** `aria-pressed` or `role="button"` attribute anywhere in the server HTML. All P03 `verify-ssr.sh` checks (incl. R19 a–g `aria-current` counts and R20 hrefs) still pass unchanged | design.md Filtering and layout controls ("renders the same two links (so no-JS still works)"); D-019 | verify-ssr |
| R6 | `/` server HTML contains exactly one `data-layout=` attribute (`data-layout="price"`); `/?layout=specs` exactly one (`data-layout="specs"`); `/?layout=bogus` exactly one (`data-layout="price"`); logged in, `/?layout=specs` exactly one `data-layout="specs"` and still all Set B / member-price checks as in P03 | architecture.md Filtering and layout; P03 R19 | verify-ssr |
| R7 | **After hydration** (JS on), each option is still an `<a>` with the same `href`, plus `role="button"` and `aria-pressed` (`"true"` on the current layout, `"false"` on the other), and no `aria-current`. The switch from the server markup happens after mount (no hydration mismatch) | design.md Components (Segmented control: "Exposes `aria-pressed` (island) or `aria-current` (links)"), Filtering and layout controls (P05) | e2e |
| R8 | **Toggle with JS.** On `/`, a plain left click (no modifier key) on `Specs first` calls `preventDefault`, sets the grid wrapper to `data-layout="specs"`, calls `history.replaceState` with `hrefs.specs` (URL becomes `/?layout=specs`), and sets `aria-pressed="true"` on `Specs first`. The first card's price label (`Everyday price`) moves from above its `<h2>` to below it (bounding box `y`), because the `order-*` / `group-data-[layout=specs]:` utilities apply. Clicking `Price first` reverses it (URL `/`). There is no document load (a `window` marker set before the click survives) and no non-prefetch RSC request (a request with header `rsc: 1` and without `next-router-prefetch`) after the click. Clicking the already-active option changes nothing | architecture.md Filtering and layout ("flips `data-layout` … keeps the URL in sync … No refetch"); design.md Filtering and layout controls (P05); D-019 | e2e |
| R9 | **URL keeps other params.** On `/?q=washable`, toggling to specs gives the URL `/?q=washable&layout=specs`; on `/?category=bath` it gives `/?category=bath&layout=specs` | architecture.md Filtering and layout; P03 R11 (`catalogHref`) | e2e |
| R10 | **The URL is the source of truth.** The island's current layout always equals the layout of the current URL (the `layout` search param parsed as in `parseCatalogParams`: `"specs"` only for exactly `specs`), including after a later navigation. Example: on `/`, toggle to `Specs first`, then click the `Bath` chip (its server href is `/?category=bath`) → URL `/?category=bath`, grid `data-layout="price"`, `Price first` has `aria-pressed="true"` | architecture.md Filtering and layout ("State lives in URL search params"); `.claude/rules/client-islands.md` | e2e |
| R11 | Modifier clicks are not intercepted: a Ctrl/Cmd/Shift/Alt click or a non-primary button keeps the browser's default link behavior | design.md Filtering and layout controls ("renders the same two links") | review |
| R12 | **No-JS.** In the JS-disabled Playwright project: `/?layout=specs` renders `data-layout="specs"`, `Specs first` has `aria-current="true"`, every card's price is visible and the first card's price label is below its `<h2>`. From `/`, clicking `Specs first` navigates (a real link) to `/?layout=specs` with the same result. Prices (`Everyday price`, `$`-amounts) are visible on both URLs | architecture.md Filtering and layout ("Its options are real links, so it still works without JS"); D-009, D-019 | e2e (no-JS) |
| R13 | `playwright.config.ts` has two projects: `chromium` (JS enabled, ignores `*.nojs.spec.ts`) and `chromium-no-js` (`javaScriptEnabled: false`, runs only `*.nojs.spec.ts`). Same `webServer` env blanking as P04 | agents/qa.md Hard rules (Playwright no-JS project); D-009 | command (`npm run test:e2e`) |
| R14 | Not wrapped in `<Suspense>`, no `loading.tsx`; `/` keeps `export const instant = false` and still builds `ƒ`. No streaming markers (`<div hidden id="S:`, `<!--$?-->`) on any catalog URL (existing verify-ssr R18-style checks) | architecture.md Server/client boundary; D-020 | verify-ssr + review |
| R15 | The builder's changes are limited to the Owned paths. `src/lib/**`, `src/schemas/**`, `src/data/**`, `public/**`, `src/proxy.ts`, `.env.example`, `next.config.ts`, `src/app/products/**`, `src/app/login/**`, `package.json` are unchanged | agents/ui.md Paths; reviewer G1 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

```ts
// src/components/client/layout-toggle.tsx   (line 1: "use client";)
import type { CatalogLayout } from "@/components/catalog-params";

/** Holds the current layout for the subtree. Renders no DOM element of its own. */
export function LayoutProvider(props: { layout: CatalogLayout; children: React.ReactNode }): React.ReactNode;

/** <div data-layout={current} className="group …">{children}</div>. Must be inside a LayoutProvider. */
export function LayoutGrid(props: { children: React.ReactNode }): React.ReactNode;

/** The segmented control: two <a href> options "Price first" / "Specs first". Must be inside a LayoutProvider. */
export function LayoutToggle(props: { hrefs: Record<CatalogLayout, string> }): React.ReactNode;
```

- Visible text: `Layout` (label), `Price first`, `Specs first`. Unchanged from P03.
- `hrefs` are computed on the server with `catalogHref`, so `price` is canonical (no `layout` param): `/`, `/?q=washable`, `/?category=bath`.
- Server HTML (no JS): `aria-current="true"` on the active `<a>`; no `aria-pressed`, no `role="button"`.
- Hydrated (JS): `role="button"` + `aria-pressed="true"|"false"` on both `<a>`, no `aria-current`.
- URL update: `window.history.replaceState(null, "", hrefs[next])`.

### Contract decisions

- **Three exports with a context.** The toggle lives in the filter card, but `data-layout` must stay on the grid wrapper (P03 R24) and must not appear in the empty state (P03 R19d), so a provider shares the state between `LayoutToggle` and `LayoutGrid`. The provider wraps server-rendered `children`; cards stay server components.
- **URL as source of truth (R10).** If the island keeps local state seeded from the `layout` prop, a later navigation that lands on the same server layout would not reset it. Reading the current URL (Next integrates `replaceState` with `useSearchParams`, see `node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md` "window.history") avoids that. The mechanism is ui's choice. **If the build or runtime then demands a `<Suspense>` boundary, escalate; never add one (D-020).**
- **`aria-current` in the server HTML, `aria-pressed` after mount.** design.md names both. Keeping the server HTML identical to P03 keeps the P03 checks valid and gives no-JS users the link semantics; the hydrated control is a toggle-button group.
- **No-JS project scoping** by file name (`*.nojs.spec.ts`), so P04's JS tests don't run without JS.
- **Toggle doesn't rewrite other server links.** After a JS toggle, the category chips, the search form's hidden `layout` input and Clear filters keep their server-rendered hrefs (from before the toggle), so following one drops the toggled layout (R10 keeps the island consistent with that). Making those follow the toggle would need them to become client components or the island to rewrite server DOM; neither is asked for by architecture.md. Recorded for the human.

## Known failure (not gating this phase)

`e2e/login.spec.ts` (P04 R17) fails because of open issue OI-1 (`handoffs/OPEN-ISSUES.md`). qa runs the whole suite and reports that one test as a known failure; it does not count against this phase's PASS. Any other e2e failure does.

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/components/client/layout-toggle.tsx` (new), `src/components/filter-card.tsx`, `src/components/product-grid.tsx`, `src/app/page.tsx` |
| qa | `playwright.config.ts`, `e2e/layout-toggle.spec.ts` (new), `e2e/layout-toggle.nojs.spec.ts` (new), `scripts/verify-ssr.sh` (extend) |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
scripts/verify-ssr.sh
npm run test:e2e        # both projects; only e2e/login.spec.ts (R17, OI-1) may fail
```

## Out of scope

- Any change to `/products/[slug]`, `/login`, `not-found.tsx`, the P04 e2e files, or OI-1.
- Making chips / search / Clear filters follow a JS toggle (Contract decisions).
- Animating the switch beyond the existing CSS; any client component other than the three exports.
- `pushState` (design.md says `replaceState`).

## Where the instructions got in the way

- architecture.md says the island "flips `data-layout` on the grid wrapper" and receives "the current layout and server-rendered `children`", but the control and the grid are in different parts of the page (filter card vs grid) and the empty state must have no `data-layout`. Resolved with a provider + two consumers.
- architecture.md / design.md don't say what happens to the other server-rendered links after a client-side toggle (they keep the old layout). Recorded as a limitation.
- design.md asks for `aria-pressed` on the island while the no-JS fallback is links with `aria-current`; the spec switches after mount.
