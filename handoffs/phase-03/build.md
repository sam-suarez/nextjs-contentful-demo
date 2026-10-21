# Phase 03: Build (ui, round 2)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `package.json`, `package-lock.json` | edited: `npm install lucide-react@1.55.0` adds `"lucide-react": "^1.55.0"` to `dependencies` (lockfile note under Open issues) | R1 |
| `next.config.ts` | edited: `images.remotePatterns: [{ protocol: "https", hostname: "images.ctfassets.net" }]`; `cacheComponents`, `partialPrefetching` and the turbopack CSS rule unchanged | R2 |
| `src/app/globals.css` | rewritten: scaffold `:root` vars, `@theme inline` Geist mapping and dark-mode block removed; `@theme` holds every R3 colour, radius, shadow (`pop`, `pop-sm/lg`, `pop-accent`, `sticker`, `sticker-member` and hover variants), `--ease-bounce`, `--font-heading`/`--font-sans` (pointing at `--font-outfit`/`--font-jakarta`), type-scale tokens, and the `pop-in`/`wiggle` keyframes; body is cream with the 24px `border` dot grid; global `:focus-visible` (2px `accent` outline, offset, hard `accent` shadow), unlayered since round 2 so it beats every `@layer`; motion (pop-in with `animation-fill-mode: both` and `calc(var(--i) * 40ms)` delay, card hover `rotate(-1deg) scale(1.02)` with a bigger shadow, icon wiggle, button translate) only inside `prefers-reduced-motion: no-preference` | R3, R4, R31 |
| `src/app/layout.tsx` | rewritten: Outfit 700/800 and Plus Jakarta Sans 400/500/700 via `next/font/google` (latin, CSS variables), no Geist, `<html lang="en">`, `<body>` = `{children}` + `<SiteFooter />`, metadata title/description; no session read | R6 |
| `src/app/page.tsx` | rewritten: `instant = false`; awaits `searchParams` and runs `parseCatalogParams`; `Promise.all([verifySession(), getProducts()])`; `filterProducts`; members-only count before filtering; renders `<SiteHeader variant="session" />` and `<main>` (banner, title area, filter card, grid or empty state). No Suspense, no loading.tsx | R13, R28 |
| `src/components/format.ts` | created: `LOGGED_OUT_BANNER_TEXT`, `formatPrice`, `formatToyCount`, `memberBannerText`, `emptyStateMessage` | R8, R9 |
| `src/components/catalog-params.ts` | created: `LAYOUTS`, types, `parseCatalogParams`, `catalogHref` (isomorphic, no `@/lib` import) | R10, R11 |
| `src/components/categories.ts` | created: `CATEGORY_META` (label, color, lucide icon), `categoryLabel` | R12 |
| `src/components/ui-classes.ts` | created: shared class strings (container, label, primary/secondary button, text link, card) and a per-colour utility map (fill, svg fill, dot tint, active-chip shadow), all as literal token utilities | R5, R29 |
| `src/components/site-header.tsx` | created: `SiteHeader({ variant })`; `session` calls `verifySession()` (Sign in primary link to `/login`, or Member pricing badge, `Signed in as <strong>`, `<form action={logout}>` with Sign out); `minimal` shows Back to catalog and never calls `verifySession` | R27 |
| `src/components/site-footer.tsx` | created: `<footer>`, white strip, top border, both strings as one text node each | R7 |
| `src/components/logo.tsx` | created: inline SVG (violet circle, pink triangle, yellow square, `aria-hidden`) and the `Tiny Confetti` wordmark, linking to `/` | R27 |
| `src/components/badge.tsx` | created: `MembersOnlyBadge` (`bg-secondary`, `Sparkles`), `MemberPricingBadge` (`bg-tertiary`) | R24, R27 |
| `src/components/price.tsx` | created: `Price({ amount, tier, className? })`, label `Everyday price` / `Member price` (uppercase by CSS), amount `formatPrice` as one text node, Outfit 800 `tabular-nums`, `accent-strong` for member | R25 |
| `src/components/product-image-frame.tsx` | created: `ProductImageFrame({ image, name, category, shape?, className? })`: `next/image` `unoptimized`, `alt={name}`, 400 fallback dimensions, category-tinted dot backdrop; placeholder (dashed `input-border`, `muted`, `ImageOff` in a white circle, `Picture coming soon`) when `image` is null | R26 |
| `src/components/banner.tsx` | created: white strip, bottom border, one text node | R28 |
| `src/components/title-area.tsx` | created: `h1` Toy catalog, squiggle, tagline; confetti and the big yellow circle in an `aria-hidden`, `pointer-events-none`, `hidden md:block` layer to the right of the text | R28, R31 |
| `src/components/confetti.tsx` | created: `Squiggle`, `ConfettiCluster` (three shapes), both `aria-hidden` | R28, R30, R31 |
| `src/components/filter-card.tsx` | created: `next/form` `<Form action="/">` with labelled `q` input, Search button, hidden `category` (only when set) / `layout` (only when specs); All + six chips as `<Link>`s via `catalogHref` with colour dot and `aria-current="true"` on the active one; Layout label with Price first / Specs first links; count; Clear filters `<Link href="/">`; round 2: search input no longer sets `focus:outline-none` | R29, R31 |
| `src/components/product-grid.tsx` | created: wrapper with `data-layout={layout}` and `group`; inner grid columns switch with `group-data-[layout=specs]:` (price 1/sm 2/lg 3/xl 4, specs 1/md 2) | R24 |
| `src/components/product-card.tsx` | created: one `<article>` per product with `--i` inline style; both variants in one card (orientation, spec block, icon placement and price position switched by `group-data-[layout=specs]:` and `order-*`); price rendered once; name in `h2` holding the only link (stretched with `after:absolute after:inset-0`); members-only badge and `secondary` sticker shadow; Highlight row omitted when `features` is empty | R24 |
| `src/components/empty-state.tsx` | created: sticker card, confetti cluster (`aria-hidden`, md+), heading, `emptyStateMessage(q)`, Clear filters link | R30 |

No `'use client'`, no `src/components/client/`, no `loading.tsx`, no `<Suspense>`. No hex literal in any `.ts`/`.tsx` under `src/app` or `src/components` (grep clean). No `tailwind.config.*`.

## Fixes this round

| Review ID | Problem | Fix |
|-----------|---------|-----|
| R31 | `:focus-visible` sat in `@layer base`, so `.btn-pop` (`@layer components`, incl. `:hover`/`:active`) and `shadow-*` utilities (active chip, active layout option) overrode the accent shadow; the search input's `focus:outline-none` removed the outline | `src/app/globals.css`: moved the `:focus-visible` rule out of `@layer base` to unlayered top level (unlayered rules beat all cascade layers regardless of specificity), with a comment explaining why. `src/components/filter-card.tsx:37`: removed `focus:outline-none`; the input keeps `focus:border-accent focus:shadow-pop-accent` from design.md. Verified in the clean-build CSS (`.next/static/chunks/*.css`): the rule is emitted at brace depth 0, after all `@layer` blocks. Covers primary buttons (also while hovered/pressed), chips, layout options, input and links |

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`, tsc no errors |
| `npm run lint` | PASS | no output |
| `npm test` | PASS | `Test Files 14 passed (14)`, `Tests 305 passed (305)` (the 3 new files: 54 tests) |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | from a clean `.next`: `ƒ /` (dynamic), `○ /_not-found`, `ƒ Proxy` |
| (round 1) `env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build` (R14) | PASS | exit 0, no warnings or errors in the log, `/` dynamic |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 262 passed, 0 failed`, `verify-ssr: PASS` |

Round 2 reran typecheck, lint, test (305 passed), boundary, a clean build and verify-ssr; R14's env-less build was not rerun (round 2 changed only CSS and one class string). Round 1 visual check (not a gate): headless Chrome screenshots of `/`, `/?layout=specs` and the empty state at 1280px show the cards in 4 columns (price first) and 2 horizontal columns (specs first), the placeholder, chips, segmented control and decoration that does not overlap text. A 375px shot was clipped by headless Chrome's minimum window width, so mobile layout was checked only by reading the classes (everything stacks or wraps, no fixed widths).

## Open issues

- **R1 lockfile:** `npm install lucide-react@1.55.0` also flipped `"dev": true` to `"devOptional": true` on two existing entries, `@types/react` and `csstype`. npm does this because lucide-react declares a peer on react whose types are optional. Their versions and integrity did not change. I did not hand-edit the lockfile. The reviewer should decide whether this counts as "changes only by that package".
- **Stale Turbopack CSS on the first build:** the first `npm run build` after my edits passed every SSR check, but `.next/static/**.css` still held the scaffold `globals.css` (Geist vars, none of my tokens). The checks don't look at CSS, so they could not catch it. `rm -rf .next` and a rebuild produced the right CSS. A later probe edit (one token plus a class) was picked up by a normal incremental build, so it did not happen again. It looks like cache state left by the pre-build run in qa, outside my paths. Whoever checks styling should do it after a clean build.
- **Optional props added within the contract's "props may grow optional fields":** `Price` and `ProductImageFrame` both take `className?`. The card uses it on the frame for the 128px size and the blob radius in the specs layout (one card serves both layouts), and on the price for its specs-row layout.
- **R31 decoration below `md`:** the empty-state confetti cluster is hidden below `md` like the rest of the decoration. The design text could be read as keeping it inside the card.

- **Round 2, design.md Input wording:** design.md's Input focus says "border accent, 4px 4px 0 0 accent shadow" with no outline. Per R31/design.md Accessibility the input now also shows the global 2px accent outline. If the design owner wants no outline on inputs, the spec and R31 need to change first.
- **Round 2, title-area overlap at ~768px (review note):** not changed this round (not a REVISE item); still worth the human visual check.

## Where the instructions got in the way

- R24 says the grid wrapper carries `data-layout` and `group`, and that `group-data-[layout=specs]:` utilities switch columns. A `group-data-*` variant only matches descendants of the group, so the wrapper cannot switch its own columns with it. I put `data-layout`/`group` on an outer wrapper and the grid one level inside it.
- The pop-in keyframe uses `transform`, and with `animation-fill-mode: both` its end state (`scale(1)`) would override a hover `transform`. Hover therefore uses the separate CSS `rotate` / `scale` properties. design.md does not mention this interaction.
- `next build` reused Turbopack cache state that served the old CSS (see Open issues). Nothing in the spec or checks catches that.
