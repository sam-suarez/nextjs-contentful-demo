# Phase 03: Catalog

**Builder:** ui  ·  **Depends on:** phase 01 (`bb5be94`: `src/lib/auth/actions.ts` exports `logout()`; `src/lib/session.ts` token format), phase 02 (`04e62d2`: `src/lib/dal.ts` exports `verifySession`, `getProducts`; `src/lib/products/filter.ts` exports `filterProducts`; `src/lib/products/types.ts` exports `CatalogProduct`, `PriceTier`)  ·  **Written by:** orchestrator

## Goal

`/` renders the Tiny Confetti catalog fully on the server: design tokens, fonts, root layout and footer, the session-aware site header (plus the `minimal` variant for P04), the banner, the title area, the filter card (search form, category chips, layout links, count, Clear filters), one name-sorted grid of sticker cards with Set B mixed in under a "Members only" badge when signed in, and an empty state. Every price and every Set B name is in the initial HTML `<body>`, with no streaming. `scripts/verify-ssr.sh` proves it in both directions.

## Requirements

Each one is decidable by a test, a command or a reading of the diff. Mock data facts used below (name order, `slug`, set, category, everyday price → member price):

| # | Name | slug | Set | Category | Everyday | Member |
|---|---|---|---|---|---|---|
| 1 | Bubble Bath Whale (no image) | `bubble-bath-whale` | public | bath | $14.00 | $11.20 |
| 2 | Cloud Bunny Plush | `cloud-bunny-plush` | public | plush | $28.00 | $22.40 |
| 3 | Forest Friends Activity Cube | `forest-friends-activity-cube` | **authenticated** | activity-sensory | $89.00 | $71.20 |
| 4 | Heirloom Wooden Xylophone | `heirloom-wooden-xylophone` | **authenticated** | musical | $54.00 | $43.20 |
| 5 | Jingle Ball Trio | `jingle-ball-trio` | public | musical | $16.00 | $12.80 |
| 6 | Moonbeam Musical Mobile | `moonbeam-musical-mobile` | **authenticated** | musical | $68.00 | $54.40 |
| 7 | Ocean Wave Rattle | `ocean-wave-rattle` | public | rattles-teethers | $12.00 | $9.60 |
| 8 | Rainbow Ring Stacker | `rainbow-ring-stacker` | public | stacking-sorting | $24.00 | $19.20 |
| 9 | Sensory Crinkle Book Set | `sensory-crinkle-book-set` | **authenticated** | activity-sensory | $36.00 | $28.80 |
| 10 | Shape Sorter Cube | `shape-sorter-cube` | public | stacking-sorting | $32.00 | $25.60 |
| 11 | Starlight Teether Ring | `starlight-teether-ring` | public | rattles-teethers | $11.00 | $8.80 |
| 12 | Sunny Duck Bath Squirter | `sunny-duck-bath-squirter` | public | bath | $9.00 | $7.20 |

No everyday price string equals any member price string, so presence/absence greps are unambiguous. Every mock image is `/products/<slug>.svg`, 400×400.

**HTML forms.** React escapes text and attributes: `'` → `&#x27;`, `&` → `&amp;`, `"` → `&quot;`. Checks match the escaped form (`You&#x27;re`, `Rattles &amp; Teethers`, `href="/?category=bath&amp;q=washable"`). Strings marked "one text node" below must be rendered from a single string expression (a literal or one helper call), so React inserts no `<!-- -->` inside them and the HTML contains them verbatim.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `package.json` `dependencies` gains exactly `"lucide-react": "^1.55.0"` (install with `npm install lucide-react@1.55.0`), and `package-lock.json` changes only by that package. No other `package.json` change | design.md Icons, Who builds what; STATE.md P03 note | review |
| R2 | `next.config.ts` adds `images: { remotePatterns: [{ protocol: "https", hostname: "images.ctfassets.net" }] }` (an equivalent `new URL("https://images.ctfassets.net/**")` entry is fine) and keeps `cacheComponents: true`, `partialPrefetching: true` and the `turbopack` CSS rule unchanged | architecture.md Error handling; D-016 defaults | review |
| R3 | `src/app/globals.css` keeps `@import "tailwindcss";`, removes the scaffold `:root` vars, `@theme inline` Geist mapping and the `prefers-color-scheme: dark` block, and declares in `@theme` these exact tokens: `--color-background: #FFFDF5`, `--color-foreground: #1E293B`, `--color-muted: #F1F5F9`, `--color-muted-foreground: #64748B`, `--color-accent: #8B5CF6`, `--color-accent-strong: #7C3AED`, `--color-secondary: #F472B6`, `--color-tertiary: #FBBF24`, `--color-quaternary: #34D399`, `--color-sky: #38BDF8`, `--color-tangerine: #FB923C`, `--color-border: #E2E8F0`, `--color-input-border: #CBD5E1`, `--color-card: #FFFFFF`, `--color-input: #FFFFFF`, `--radius-sm: 8px`, `--radius-md: 16px`, `--radius-lg: 24px`, `--shadow-pop` (`4px 4px 0 0` in `foreground`), sticker shadows (`8px 8px 0 0` in `border`, and in `secondary` for members-only cards), `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`, and `--font-heading` / `--font-sans` pointing at the two `next/font` variables. The body background is `background` with the dot grid (a CSS `radial-gradient` of `border`-coloured dots every 24px, no image file). No `tailwind.config.*` file exists | design.md Design tokens, Texture; D-005 | review |
| R4 | Motion is CSS only: a pop-in keyframe (scale 0.9→1, opacity 0→1, 400ms, `--ease-bounce`) with `animation-delay: calc(var(--i) * 40ms)`, an icon wiggle keyframe (0→3°→-3°→0) on card hover, and a card hover of `rotate(-1deg) scale(1.02)` with a bigger shadow. `prefers-reduced-motion: reduce` disables pop-in, wiggle, rotate and button translate, and `animation-fill-mode: both` applies only when motion is allowed. Each card sets `--i` (its index in the rendered list) through an inline `style`. No client component exists for animation | design.md Motion | review |
| R5 | No raw hex colour literal (`#` followed by 3, 4, 6 or 8 hex digits) appears in any `.tsx` or `.ts` file under `src/app/**` or `src/components/**`; components use token utilities (`bg-accent-strong`, `fill-secondary`, `shadow-pop`, …), including the inline SVGs (logo, squiggle, confetti) | design.md Design tokens; agents/ui.md Hard rules | review |
| R6 | `src/app/layout.tsx` loads Outfit (weights 700, 800) and Plus Jakarta Sans (400, 500, 700) with `next/font/google` (subset `latin`, CSS variables), imports no Geist font, renders `<html lang="en">` with the font variables, and a `<body>` containing `{children}` followed by `<SiteFooter />`. It exports `metadata` with `title: "Tiny Confetti"` and `description: "Bright, safe toys for little hands."`. Neither the layout nor anything it renders imports `@/lib/dal`, calls `verifySession`, `cookies()` or `headers()` | design.md Page shell, Typography; architecture.md Server/client boundary (root layout never reads the session); D-020 | review |
| R7 | The footer (`<footer>`, white strip, top border) contains `Tiny Confetti demo catalog` and `Prices in USD. Member prices need sign-in.`, each one text node. In the HTML of `/` both strings appear, and `<footer` appears at least once | design.md Page shell | verify-ssr + review |
| R8 | `formatPrice(amount)` returns `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` output with exactly two decimals: `11.2` → `"$11.20"`, `9` → `"$9.00"`, `71.2` → `"$71.20"`, `0` → `"$0.00"`, `1234.5` → `"$1,234.50"` | design.md Components (Price) | unit |
| R9 | `formatToyCount(n)`: `0` → `"0 toys"`, `1` → `"1 toy"`, `2` → `"2 toys"`, `8` → `"8 toys"`, `12` → `"12 toys"`. `memberBannerText(n)`: `4` → `"Member prices are on. You're also seeing 4 members-only toys."`, `1` → `"Member prices are on. You're also seeing 1 members-only toy."`, `0` → `"Member prices are on."`. `emptyStateMessage(q)`: any `q` that is non-empty after trimming → `"Try a different word or category."`; `""` or whitespace-only → `"No toys in this category yet."`. The exported constant `LOGGED_OUT_BANNER_TEXT` equals `"You're seeing everyday prices. Sign in to unlock member prices and members-only toys."` (straight apostrophe U+0027 in all of these) | design.md Screens (Catalog: Count, Banner, Empty state) | unit |
| R10 | `parseCatalogParams(searchParams)` takes the awaited `searchParams` object and returns `{ category, q, layout }`. For each key it uses the value, or the first element when the value is an array, or nothing when `undefined`. `category`: the value when it is exactly one of `CATEGORIES`, else `null` (`"robots"`, `""`, `"Bath"`, missing → `null`; `["bath","plush"]` → `"bath"`). `q`: the value trimmed, `""` when missing (`"  soft  "` → `"soft"`, `["a","b"]` → `"a"`). `layout`: `"specs"` only when the value is exactly `"specs"`; otherwise `"price"` (`"price"`, `"bogus"`, `"SPECS"`, missing → `"price"`). Unknown keys are ignored. It never throws for any `Record<string, string \| string[] \| undefined>` | architecture.md Filtering and layout (unknown values ignored); D-019 | unit |
| R11 | `catalogHref(params)` returns `"/"` or `"/?"` + a query built with `URLSearchParams` in the fixed key order `category`, `q`, `layout`, where `category` is omitted when `null`/`undefined`, `q` is omitted when `undefined` or empty after trimming (else the trimmed value is used), and `layout` is omitted when `undefined` or `"price"`. Cases: `{}` → `"/"`; `{ category: "bath" }` → `"/?category=bath"`; `{ category: "bath", q: "soft toy", layout: "specs" }` → `"/?category=bath&q=soft+toy&layout=specs"`; `{ q: "  " }` → `"/"`; `{ layout: "price" }` → `"/"`; `{ layout: "specs" }` → `"/?layout=specs"`; `{ q: "a&b" }` → `"/?q=a%26b"`; `{ category: null, q: "washable", layout: "specs" }` → `"/?q=washable&layout=specs"` | architecture.md Filtering and layout; design.md Filtering and layout controls; D-019 | unit |
| R12 | `CATEGORY_META` has exactly the six `CATEGORIES` as keys, each `{ label, color, icon }`: `rattles-teethers` → `"Rattles & Teethers"`, `"secondary"`, `Baby`; `plush` → `"Plush"`, `"accent"`, `Rabbit`; `stacking-sorting` → `"Stacking & Sorting"`, `"tertiary"`, `Shapes`; `bath` → `"Bath"`, `"sky"`, `Bath`; `activity-sensory` → `"Activity & Sensory"`, `"quaternary"`, `Puzzle`; `musical` → `"Musical"`, `"tangerine"`, `Music` (icons are the `lucide-react` named exports, compared by identity). `categoryLabel(c)` returns `CATEGORY_META[c].label` | design.md Category colour and icon | unit |
| R13 | `src/app/page.tsx` exports `const instant = false` and a default async page that `await`s `searchParams`, passes it to `parseCatalogParams`, gets products only from `getProducts()` and the session only from `verifySession()` (both `@/lib/dal`), filters with `filterProducts(products, { category, q })`, and renders `<SiteHeader variant="session" />` and a `<main>` with the banner, title area, filter card and the grid or the empty state. No `<Suspense>` import or element and no `loading.tsx` anywhere under `src/app/**`; no `cookies()`, `headers()`, `contentful` import or `fetch(` under `src/app/**` or `src/components/**` | architecture.md Routes, Server/client boundary, Data access; D-017, D-020; `.claude/rules/ssr-rendering.md` | review + verify-ssr |
| R14 | `env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build` succeeds (no `SESSION_SECRET` at build time; `/` is not prerendered with product data). This is also the first build that compiles `fetchProducts`'s `"use cache"` and the `"use server"` functions in `src/lib/auth/actions.ts` | architecture.md Server/client boundary; D-020; STATE.md P03 notes | command (qa post-build) |
| R15 | SSR, **logged out** (`GET /`, no cookie): status 200; contains all 8 public names; contains none of the 4 authenticated names; `>Everyday price<` occurs exactly 8 times and `>Member price<` 0 times; contains `$14.00`, `$28.00`, `$16.00`, `$12.00`, `$24.00`, `$32.00`, `$11.00`, `$9.00`; contains none of the 12 member price strings and none of `$89.00`, `$54.00`, `$68.00`, `$36.00`; contains no `>Members only<` and no `>Member pricing<`; contains `You&#x27;re seeing everyday prices. Sign in to unlock member prices and members-only toys.`; contains `href="/login"` and `>Sign in<`; contains no `$ACTION_ID_` and no `Signed in as`; contains `>8 toys<`; `<article` occurs exactly 8 times | architecture.md Routes, Tests; design.md Catalog, Site header; D-013 item 3, D-014, D-017 | verify-ssr |
| R16 | SSR, **logged in** (`GET /` with a valid `session` cookie for the name `ssr-checker`): status 200; contains all 12 names, and their first occurrences are in the name order of the table above (Set B mixed in, not appended); `>Member price<` occurs exactly 12 times and `>Everyday price<` 0 times; contains all 12 member price strings and none of the 12 everyday price strings; `>Members only<` occurs exactly 4 times; contains `Member prices are on. You&#x27;re also seeing 4 members-only toys.`; contains `>Member pricing<`, `Signed in as`, `>ssr-checker<`, `>Sign out<` and `$ACTION_ID_` (the hidden input React renders for a server-action `<form>`, so sign-out works without JS); contains no `href="/login"` and no `You&#x27;re seeing everyday prices`; contains `>12 toys<`; `<article` occurs exactly 12 times | architecture.md Routes, Auth, Tests; design.md Catalog, Site header; D-013 item 3, D-017 | verify-ssr |
| R17 | SSR, **bad cookie** (`session=not-a-jwt`): same assertions as R15 for authenticated names, `>Everyday price<` (8), `>Member price<` (0) and member price strings | architecture.md Auth; D-012 | verify-ssr |
| R18 | No streaming and no fallback, on **every** page the script fetches: the HTML contains no `<div hidden id="S:`, no `<!--$?-->`, no `<template id="B:` and no `Loading` (case-sensitive; `loading="lazy"` attributes are fine) | D-020; architecture.md Server/client boundary, Tests | verify-ssr |
| R19 | SSR, **filtered URLs** render filtered HTML (no cookie unless stated): (a) `/?category=bath` → contains `Bubble Bath Whale` and `Sunny Duck Bath Squirter`, not `Cloud Bunny Plush`, `>2 toys<`, and exactly 2 `<a …>` tags have `aria-current="true"`, both with `href="/?category=bath"` (the Bath chip and the active "Price first" link, whose canonical URL is the same); (b) `/?q=washable` → `>1 toy<`, contains `Cloud Bunny Plush`, not `Ocean Wave Rattle`, and an `<input …>` tag with `name="q"` and `value="washable"`; (c) `/?q=washable` logged in → `>2 toys<`, contains `Cloud Bunny Plush` and `Sensory Crinkle Book Set`; (d) `/?category=activity-sensory` → `>0 toys<`, `>No toys match your search<`, `>No toys in this category yet.<`, no `data-layout=`; logged in → `>2 toys<` with `Forest Friends Activity Cube` and `Sensory Crinkle Book Set`; (e) `/?q=zzz` → `>0 toys<`, `>Try a different word or category.<`; (f) `/?category=robots&layout=bogus` → `>8 toys<`, `data-layout="price"`, and exactly 2 `<a …>` tags have `aria-current="true"`, both with `href="/"` (the "All" chip and "Price first"); (g) `/?layout=specs` → `data-layout="specs"`, `>8 toys<`, and exactly 2 `<a …>` tags have `aria-current="true"`, both with `href="/?layout=specs"` (the "All" chip and "Specs first") | architecture.md Filtering and layout; design.md Filtering and layout controls, Catalog; D-019 | verify-ssr |
| R20 | SSR, **links keep state**: on `/?q=washable&layout=specs` the HTML contains `href="/?category=bath&amp;q=washable&amp;layout=specs"` (Bath chip), `href="/?q=washable&amp;layout=specs"` ("All" chip), `href="/?q=washable"` ("Price first"), an `<input …>` tag with `type="hidden"`, `name="layout"` and `value="specs"`, no `<input …>` tag with `name="category"`, and a `<form …>` tag with `action="/"`. On `/?category=bath&layout=specs` it contains an `<input …>` tag with `type="hidden"`, `name="category"`, `value="bath"`. Every page contains `href="/"` and `>Clear filters<` | architecture.md Filtering and layout; design.md Filtering and layout controls; D-019 | verify-ssr |
| R21 | SSR, **cards and images**, logged out: `href="/products/cloud-bunny-plush"` occurs exactly once; an `<img …>` tag with `src="/products/cloud-bunny-plush.svg"` and `alt="Cloud Bunny Plush"` exists; `>Picture coming soon<` occurs exactly once and no tag has `src="/products/bubble-bath-whale.svg"`; `<h1` occurs exactly once, with `>Toy catalog<` and `>Bright, safe toys for little hands.<` present; `<main` occurs exactly once and `<header` at least once; `>Tiny Confetti<` is present (logo wordmark) | design.md Components (Image frame, Image placeholder, Sticker card), Page shell, Accessibility; architecture.md Error handling | verify-ssr |
| R22 | SSR, **filter card copy** on `/`: `>Search<` (the input's label and the submit button), `placeholder="Search toys by name or feature"`, the seven chip labels `>All<`, `>Rattles &amp; Teethers<`, `>Plush<`, `>Stacking &amp; Sorting<`, `>Bath<`, `>Activity &amp; Sensory<`, `>Musical<` (first occurrences in this order), `>Layout<`, `>Price first<`, `>Specs first<` | design.md Screens (Catalog), Components (Category chip, Segmented control) | verify-ssr |
| R23 | The server log of the started server contains `[products] source: mock` after the first request (the checks really ran on mock data) | architecture.md Data access, Tests; D-021 | verify-ssr |
| R24 | Card markup: each product is one `<article>` with the name in an `<h2>` holding the card's only link (`<Link href={"/products/" + slug}>`, stretched with `after:absolute after:inset-0`). Both variants are server-rendered in the same card: the grid wrapper carries `data-layout={layout}` and `group`, and `group-data-[layout=specs]:` utilities switch columns (price: 1 / `sm` 2 / `lg` 3 / `xl` 4; specs: 1 / `md` 2), orientation (horizontal from `sm`) and which spec block shows. Price first shows image, icon circle, price, name, category label, and `ageRange · material`; specs first shows image (blob radius, 128px), name with badge, category, rows `Age range`, `Material`, `Highlight` (`features[0]`, row omitted when `features` is empty), then the price. The price element is rendered **once** per card and moved with `order-*`. Members-only cards (`visibility === "authenticated"`) show the "Members only" badge (`bg-secondary`, `Sparkles` icon) and the `secondary` sticker shadow | design.md Screens (Catalog: card content), Components; architecture.md Filtering and layout; D-019 | review (+ R15/R16 counts) |
| R25 | `Price` renders a label element whose whole text is `Everyday price` (`tier: "everyday"`, `foreground` amount) or `Member price` (`tier: "member"`, label and amount in `accent-strong`), uppercase via CSS only, above the amount `formatPrice(amount)` as one text node in Outfit 800 with `tabular-nums`. Pages pass `product.price` and `product.priceTier`; nothing under `src/app/**` or `src/components/**` reads a session to choose a price or label | design.md Components (Price); STATE.md P02 contract (pages never pick a price) | review (+ R15/R16) |
| R26 | Image frame: square, `object-contain`, category-tinted dot backdrop, `next/image` with `unoptimized`, `src={image.url}`, `alt={product.name}`, and `width`/`height` from the image (400 when `null`). Placeholder when `image` is `null`: same frame size, dashed 2px `input-border`, `muted` fill, `ImageOff` icon in a white circle, text `Picture coming soon` (one text node), no `<img>` | design.md Components (Image frame, Image placeholder); architecture.md Error handling | review (+ R21) |
| R27 | `SiteHeader({ variant })`: `"session"` calls `verifySession()`; logged out it shows the logo and a primary button link `Sign in` to `/login`; logged in the `Member pricing` badge (`bg-tertiary`), `Signed in as <strong>{name}</strong>` and a `<form action={logout}>` (`logout` from `@/lib/auth/actions`) whose submit button reads `Sign out` (secondary button). `"minimal"` shows the logo and a text link `Back to catalog` to `/`, and never calls `verifySession`. The logo is an inline SVG (violet circle, pink triangle, yellow square, `aria-hidden`) plus the wordmark `Tiny Confetti`, linking to `/` | design.md Page shell (Site header), Direction (Brand); architecture.md Server/client boundary | review (+ R15/R16) |
| R28 | Banner (white strip under the header, bottom border): logged out `LOGGED_OUT_BANNER_TEXT`, logged in `memberBannerText(n)` with `n` = the number of products from `getProducts()` with `visibility === "authenticated"` counted **before** filtering; one text node, no link inside the sentence. Title area: `h1` `Toy catalog`, pink squiggle SVG, tagline `Bright, safe toys for little hands.`, confetti and a big yellow circle behind the title | design.md Screens (Catalog: Banner), Texture | review (+ R15/R16/R21) |
| R29 | Filter card (white sticker card, no hover motion): search is `next/form` `<Form action="/">` with a labelled `q` input (`defaultValue={q}`, placeholder `Search toys by name or feature`), a primary submit button `Search`, and hidden inputs `category` (only when a category is active) and `layout` (only when `"specs"`). Category chips: `All` plus the six categories in `CATEGORIES` order, each a `<Link href={catalogHref({ category, q, layout })}>` (`All`: `category: null`) with the category-colour dot; the active chip has `aria-current="true"` and the inverted fill. Layout: label `Layout`, two `<Link>`s `Price first` / `Specs first` to `catalogHref({ category, q, layout: "price" \| "specs" })`, the active one with `aria-current="true"`. Count `formatToyCount(visible.length)` (one text node) and a secondary button `<Link href="/">Clear filters</Link>` | design.md Screens (Catalog), Filtering and layout controls, Components; architecture.md Filtering and layout; D-019 | review (+ R19/R20/R22) |
| R30 | Empty state replaces the grid when the filtered list is empty: a sticker card with a cluster of three confetti shapes (`aria-hidden`), heading `No toys match your search`, body `emptyStateMessage(q)`, and a secondary button `<Link href="/">Clear filters</Link>`. No grid wrapper (`data-layout`) is rendered | design.md Components (Empty state), Screens (Catalog); architecture.md Error handling | review (+ R19) |
| R31 | Icons come from `lucide-react` with `strokeWidth={2.5}` and `aria-hidden="true"`, always inside a shape (circle or pill). All decoration (confetti, squiggle, big circle, logo shapes, dot backdrop) is `aria-hidden="true"`, `pointer-events-none`, hidden below `md` (except the logo and in-card backdrop), and never overlaps text. Every form control has a visible `<label>`; `:focus-visible` shows a 2px `accent` outline with offset plus the hard `accent` shadow; tap targets (buttons, chips, inputs, layout options) are at least 48px tall | design.md Icons, Texture, Accessibility, Responsive | review |
| R32 | No `'use client'` is added anywhere (P03 has no island) and `src/components/client/` is not created; `scripts/check-client-boundary.sh` prints `OK: client boundary respected` | architecture.md Server/client boundary; D-022 | command + review |
| R33 | The builder's changes are limited to the files under Owned paths. `src/lib/**`, `src/schemas/**`, `src/data/**`, `public/**`, `src/proxy.ts`, `.env.example` are unchanged | agents/ui.md Paths; reviewer G1 | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional. All imports use the `@/` alias. The three `.ts` helper modules are plain isomorphic TypeScript: no `import "server-only"`, no `"use client"`, no import from `@/lib/**` (so the P05 island may import `catalog-params.ts`).

```ts
// src/components/format.ts
export const LOGGED_OUT_BANNER_TEXT: string;           // R9, exact text
export function formatPrice(amount: number): string;    // "$11.20"
export function formatToyCount(n: number): string;      // "1 toy" | "8 toys"
export function memberBannerText(membersOnlyCount: number): string;
export function emptyStateMessage(q: string): string;
```

```ts
// src/components/catalog-params.ts
import type { Category } from "@/schemas/product";

export const LAYOUTS: readonly ["price", "specs"];
export type CatalogLayout = "price" | "specs";
export type RawSearchParams = Record<string, string | string[] | undefined>;
export type CatalogParams = { category: Category | null; q: string; layout: CatalogLayout };

export function parseCatalogParams(searchParams: RawSearchParams): CatalogParams;     // R10
export function catalogHref(params: Partial<CatalogParams>): string;                 // R11
```

```ts
// src/components/categories.ts
import type { LucideIcon } from "lucide-react";
import type { Category } from "@/schemas/product";

export type CategoryColor = "secondary" | "accent" | "tertiary" | "sky" | "quaternary" | "tangerine";
export type CategoryMeta = { label: string; color: CategoryColor; icon: LucideIcon };

export const CATEGORY_META: Record<Category, CategoryMeta>;   // R12
export function categoryLabel(category: Category): string;
```

Server components P04 reuses (names fixed; props may grow optional fields):

```tsx
// src/components/site-header.tsx
export async function SiteHeader(props: { variant: "session" | "minimal" }): Promise<JSX.Element>;
// src/components/site-footer.tsx
export function SiteFooter(): JSX.Element;
// src/components/price.tsx
import type { PriceTier } from "@/lib/products/types";
export function Price(props: { amount: number; tier: PriceTier }): JSX.Element;
// src/components/product-image-frame.tsx
import type { ProductImage } from "@/lib/products/types";
import type { Category } from "@/schemas/product";
export function ProductImageFrame(props: { image: ProductImage | null; name: string; category: Category; shape?: "square" | "blob" }): JSX.Element;
// src/components/badge.tsx
export function MembersOnlyBadge(): JSX.Element;
export function MemberPricingBadge(): JSX.Element;
```

Other component files under `src/components/` (logo, banner, title area, filter card, grid, card, empty state, buttons) are named by the builder.

```tsx
// src/app/page.tsx
export const instant = false;
export default async function CatalogPage(props: PageProps<"/">): Promise<JSX.Element>;
```

Page flow: `const params = parseCatalogParams(await props.searchParams)`; `const [session, products] = await Promise.all([verifySession(), getProducts()])` (or sequential); `const visible = filterProducts(products, { category: params.category, q: params.q })`; `membersOnlyCount = products.filter(p => p.visibility === "authenticated").length`; banner logged in when `session !== null`.

### `scripts/verify-ssr.sh` (qa)

- `#!/usr/bin/env bash`, `set -euo pipefail`, executable, run from any directory (it `cd`s to the repo root).
- Environment for build and server: `CONTENTFUL_SPACE_ID=`, `CONTENTFUL_ENVIRONMENT=`, `CONTENTFUL_DELIVERY_TOKEN=` exported as empty strings, and its own `SESSION_SECRET` (at least 32 characters, generated or fixed in the script, never read from `.env.local`).
- Runs `npm run build` itself unless `VERIFY_SSR_SKIP_BUILD=1`, then starts `npm start` on `VERIFY_SSR_PORT` (default `3210`), waits up to 60 s for it to answer, and stops it from a `trap … EXIT` (always, also on failure). Server stdout/stderr go to a temp file, used for R23.
- Mints the logged-in cookie with `node` + `jose` (no login UI): `new SignJWT({ name: "ssr-checker" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(<now + 3600>)`, signed with `new TextEncoder().encode(SESSION_SECRET)`; sent as `Cookie: session=<token>`. Payload exactly `{ name, exp }` (P01 contract).
- Fetches with `curl` (no redirects followed), prints one `PASS: <requirement>: <assertion>` or `FAIL: …` line per assertion, a final summary, and exits non-zero if any assertion failed. Tag lookups (`<a …>`, `<input …>`, `<img …>`, `<form …>`) match a whole tag and check attributes regardless of their order.
- It covers R15 to R23. Later phases extend it.

### Rendered strings (copied from `docs/design.md`; source text, before HTML escaping)

- Brand wordmark `Tiny Confetti`; tagline / title-area subtitle `Bright, safe toys for little hands.`; page title `Toy catalog`.
- Header: `Sign in`, `Member pricing`, `Signed in as`, `Sign out`, `Back to catalog`.
- Banner: R9 strings. Footer: R7 strings.
- Filter card: `Search` (label and button), placeholder `Search toys by name or feature`, `All`, the six category labels (R12), `Layout`, `Price first`, `Specs first`, count (R9), `Clear filters`.
- Card: `Everyday price` / `Member price`, `Members only`, `Age range`, `Material`, `Highlight`, `Picture coming soon`.
- Empty state: `No toys match your search`, body (R9), `Clear filters`.

### Contract decisions

Choices architecture.md and design.md leave open, made by the orchestrator for this phase:

- **Copy helpers live in `src/components/format.ts`** so the count, banner and empty-state strings are unit-tested and rendered as one text node each (React would otherwise split `{n} toys` with `<!-- -->` and break exact greps).
- **`layout=price` is canonicalised away.** `catalogHref` omits the default layout, so "Price first" links to the same URL without `layout` (`/`, `/?q=washable`). design.md writes the link as `?layout=price`; the canonical form gives one URL per state and the same result (`parseCatalogParams` maps a missing layout to `"price"`).
- **`<main>` is rendered by the page, not the root layout.** design.md puts `<main>` in the root layout, but the header is per page (architecture.md) and its Accessibility section wants `header`, `main` and `footer` as sibling landmarks; a `<header>` inside `<main>` is not a banner landmark. The layout renders `{children}` + `<SiteFooter />`; each page renders `<SiteHeader>` then `<main>`.
- **Image `alt` is the product name** (design.md Image frame), not `ProductImage.alt`. This also settles the P02 note about empty-string asset descriptions.
- **Null image dimensions fall back to 400×400** (the size of every current asset).
- **No link inside the banner sentence** in P03, so the sentence stays one greppable text node; the header already has "Sign in".
- **`memberBannerText(0)` is `"Member prices are on."`** and `1` uses the singular, so the sentence is never wrong for other data.
- **`q` is trimmed by `parseCatalogParams`** (the input shows the trimmed value); `filterProducts` trims again harmlessly.
- **Layout hidden input only when `"specs"`, category hidden input only when set**, so a search from `/` submits just `?q=…`.
- **`lucide-react@^1.55.0`**: the newest release at least 10 days old on 2026-10-20 (1.60.0 shipped the same day).
- **`verify-ssr.sh` builds by default** so a stale `.next` never passes; `VERIFY_SSR_SKIP_BUILD=1` exists for quick local reruns only.
- **The verify-ssr session name is `ssr-checker`** (no characters React would escape).

## Owned paths

| Role | May change |
|------|------------|
| ui | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, new files under `src/components/` (not `src/components/client/`), `next.config.ts`, `package.json` + `package-lock.json` (R1 only) |
| qa | `scripts/verify-ssr.sh`, `src/components/format.test.ts`, `src/components/catalog-params.test.ts`, `src/components/categories.test.ts` |

`package.json` changes allowed: `"lucide-react": "^1.55.0"` added to `dependencies` (via `npm install lucide-react@1.55.0`), with the matching lockfile change. Nothing else.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build   # R14
scripts/verify-ssr.sh
```

`next/font/google` downloads the fonts at build time, so the build needs network access; a font-download failure is an environment failure (escalate, don't swap fonts). If the build rejects `fetchProducts`'s `"use cache"` in `src/lib/dal.ts` or the function-level `"use server"` in `src/lib/auth/actions.ts`, escalate: both files belong to data-auth. If the build reports runtime data accessed outside `<Suspense>`, the fix is `instant = false`, never `<Suspense>` (D-020).

## Out of scope

- `/products/[slug]`, `/login`, `not-found.tsx` and any page using the `minimal` header (P04). The product links on cards point at `/products/<slug>`, which 404s until P04.
- The layout-toggle client island, `history.replaceState`, `aria-pressed` and anything under `src/components/client/` (P05).
- Playwright, `playwright.config.ts`, `e2e/**` (P04).
- Any change to `src/lib/**` (DAL, filtering, session, actions), `src/proxy.ts`, `src/schemas/**`, `src/data/**`, `public/**` (including the scaffold's `public/*.svg` files), `.env.example`.
- Pagination, sorting controls, a separate Set B section, client-side filtering, dark mode.

## Where the instructions got in the way

- design.md Page shell puts `<main>` in the root layout while architecture.md renders the header per page and design.md Accessibility asks for `header` / `main` / `footer` landmarks. Resolved by having each page render `<main>` (Contract decisions).
- design.md writes the "Price first" link as `?layout=price`; the spec canonicalises the default away. design.md could say "the URL without `layout`".
- design.md lists an "optional text link" in the banner. A link inside the sentence would split it in the HTML; the spec drops it for P03.
- Unit tests are Node-only `.test.ts` files, so components (JSX, async server components) cannot be unit-rendered. Copy and URL logic were pulled into three plain `.ts` modules for unit tests, and everything rendered is checked through `verify-ssr.sh`; layout and styling are review-only.
- React's HTML escaping (`&#x27;`, `&amp;`) and the `<!-- -->` text separators decide whether a grep for design.md copy can pass at all. Neither architecture.md Tests nor `agents/qa.md` mentions it; the spec spells out the escaped forms.
- The thread again started from a pasted prompt, not `/phase`, so the D-029 orchestrator path-guard hook is off; Paths kept by hand.
