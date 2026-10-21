# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent edits this file, and the reviewer never reads it (D-024). Seeded manually in Part 4. Phase plan from D-026.

## Current

| Field | Value |
|---|---|
| Phase | 04 detail + login (next; 03 catalog done, awaiting human check) |
| Status | not started <!-- not started / spec / build / review / done / escalated --> |
| Build round | 0 of 3 |
| Base commit | <set by the orchestrator when the phase starts: `git rev-parse --short HEAD`> |
| Open escalation | none |

## Phase plan

Run in order, one phase per thread, each ending at the human gate (D-026).

| Phase | Builder | Builds | qa writes first (D-025) | Status | Commit |
|---|---|---|---|---|---|
| 01 auth core | data-auth | `src/lib/session.ts` (sign/verify, set/delete cookie), `src/lib/auth/actions.ts` (login/logout, zod, safe `next`), `src/proxy.ts` (optimistic redirects), `SESSION_SECRET` in `.env.example` | Unit: token round-trip, tampered and expired tokens rejected, missing/short secret throws, empty name rejected, `next` validation (`//evil.com` and `https://…` rejected, `/products/x` accepted) | done (2 rounds used) | `feat(auth): phase 01 - auth core` |
| 02 data layer | data-auth | Mock and live adapters, source selection + one log line, `fetchProducts` (`'use cache'`), `src/lib/dal.ts` (`verifySession`, `getProducts`, `getProductBySlug`), pure `filterProducts` | Unit: logged out never returns `authenticated`, logged in returns both sets, slug results (product / requires login / not found), category, `q` and combined filters, `https:` prefix on live image URLs, empty `CONTENTFUL_*` selects mock | done (1 round used) | `feat(data): phase 02 - data layer` |
| 03 catalog | ui | Design tokens + fonts + root layout/footer, site header (both variants, sign-out form), banner, `/` with `instant = false`, both card variants (Set B mixed in with "Members only" badge), price, image placeholder, filter card (search form, category links, layout links, count, Clear filters), empty state, `next.config.ts` images, `lucide-react` (`docs/design.md`) | `scripts/verify-ssr.sh`: both directions with a self-minted cookie, no `<div hidden id="S:`, no `<!--$?-->`, no fallback text, a filtered URL renders filtered HTML | done (2 rounds used) | `feat(catalog): phase 03 - catalog` |
| 04 detail + login | ui | `/products/[slug]` (307 to `/login?next=`, `notFound()` + `not-found.tsx`), `/login` page with `?error=missing` alert (`docs/design.md`) | Extend verify-ssr.sh (unknown slug 404, Set B slug 307 with `next`, logged-in detail price); add `playwright.config.ts` + browser install; e2e: login → Set B visible → logout | not started | |
| 05 layout toggle | ui | Client island in `src/components/client/` replacing the P03 layout links (still real links without JS), `data-layout` on the grid, `group-data` switching, `history.replaceState` URL sync | e2e: toggle reorders cards with no navigation/reload; JS disabled: `?layout=specs` renders specs-first | not started | |
| 06 release check | qa only | Runs every check against `next build && next start`, incl. the JS-disabled Playwright project | (none: no builder). Each failure becomes `phase-NN-fixK` for the owner of the failing path | not started | |

### Phase notes for spec writing

- P01: the cookie name (`session`), payload (display name + expiry) and flags are fixed by architecture.md Auth. Pick and record the export names in the spec contract; P02 and P03 depend on them. The login action reads form fields `username`, `password` and `next`; both trimmed values must be non-empty, the password is discarded, and empty input redirects to `/login?error=missing` (keeping `next`). Logout redirects to `/`.
- P01 contract as built (P02/P03/P04 call these): `src/lib/session.ts` exports `SESSION_COOKIE` (`"session"`), `SESSION_TTL_SECONDS`, `type Session = { name: string; expiresAt: Date }`, `signSession(name)`, `verifySessionToken(token)`, `createSession(name)`, `deleteSession()`. `src/lib/auth/next-path.ts` exports `safeNextPath(value): string | null`. `src/lib/auth/actions.ts` exports `login(formData)` and `logout()` with function-level `"use server"` (callers must be server components). `src/proxy.ts` matches `/login` only. `verifySessionToken` throws when `SESSION_SECRET` is missing or short, even for a missing token, so every check that starts a server must set its own secret.
- P02 contract as built (P03/P04 call these; full shapes in `handoffs/phase-02/spec.md` Contract): `src/lib/dal.ts` exports `verifySession(): Promise<Session | null>`, `getProducts(): Promise<CatalogProduct[]>` (name order, Set B mixed in when logged in), `getProductBySlug(slug): Promise<ProductBySlugResult>` with `{ status: "found"; product } | { status: "requires-login" } | { status: "not-found" }`. `src/lib/products/types.ts` exports `CatalogProduct` (`id, slug, name, category, visibility, description, ageRange, material, features: string[], image: { url, alt, width, height } | null, price: number, priceTier: "everyday" | "member"`), `ProductImage`, `PriceTier`. `src/lib/products/filter.ts` exports `filterProducts(products, { category?, q? })` taking raw search-param strings (unknown category and blank `q` ignored). Pages render `price` and pick the label from `priceTier`; they never choose a price. All three DAL functions throw without `SESSION_SECRET`.
- P03: `fetchProducts`'s `"use cache"` (function-level, in a file whose first line is `import "server-only";`) is first compiled by P03's build, because no route imported `dal.ts` before. If the build rejects it, escalate. The `[products] source: …` log line fires on the first cache miss per server instance, not at startup. `ProductImage.alt` is `description ?? title`, so an empty-string description gives `alt: ""`; the card may treat that as decorative or the human may want a P02 follow-up.
- P02: `verifySession()` reads `(await cookies()).get(SESSION_COOKIE)?.value` and calls `verifySessionToken`, wrapped in React `cache`. Do not re-implement JWT verification.
- P03: the sign-out form is the first place Next compiles `actions.ts`'s function-level `"use server"` through its server-action transform. If the build rejects it, escalate (don't move to a file-level directive without a decision, because of the `server-only` first-line rule).
- P02: `getProductBySlug` must return a discriminated result (product / requires login / not found) so P04 can redirect or call `notFound()` without re-checking the session. The DAL also resolves which price applies (e.g. `price` + `priceTier: "everyday" | "member"` per product), so pages never pick a price from the session and a logged-out render never holds a member price. `q` matches name, description and features, case-insensitive, trimmed.
- P03: copy every string the checks rely on from `docs/design.md` into the spec contract: price format (`$11.20`), price labels ("Everyday price" / "Member price"), the "Members only" badge, banner sentences, count text, empty-state text. Set B is mixed into the one grid with the badge (no separate section). The spec lists `lucide-react` as the allowed `package.json` change and the font swap (Outfit + Plus Jakarta Sans). The logged-in direction uses a cookie minted by the script, not the login UI.
- P03 contract as built (P04/P05 call these; full shapes in `handoffs/phase-03/spec.md` Contract): `src/components/site-header.tsx` `SiteHeader({ variant: "session" | "minimal" })` (minimal = logo + "Back to catalog", no session read); `site-footer.tsx` `SiteFooter` (rendered by the root layout); `price.tsx` `Price({ amount, tier, className? })`; `product-image-frame.tsx` `ProductImageFrame({ image, name, category, shape?: "square" | "blob", className? })`; `badge.tsx` `MembersOnlyBadge`, `MemberPricingBadge`; `format.ts` (`formatPrice`, `formatToyCount`, `memberBannerText`, `emptyStateMessage`, `LOGGED_OUT_BANNER_TEXT`); `catalog-params.ts` (`LAYOUTS`, `CatalogLayout`, `parseCatalogParams`, `catalogHref`; isomorphic, so the P05 island may import it); `categories.ts` (`CATEGORY_META`, `categoryLabel`); shared class strings in `ui-classes.ts` (`BUTTON_PRIMARY`, `BUTTON_SECONDARY`, `TEXT_LINK`, `LABEL`, `CARD_BASE`, …). Pages render `<SiteHeader>` then their own `<main>`; the root layout renders `{children}` + `<SiteFooter />` only.
- P03 → P04: `scripts/verify-ssr.sh` runs its own build (skip with `VERIFY_SSR_SKIP_BUILD=1`), port `VERIFY_SSR_PORT` (default 3210), mints `session` for `ssr-checker`; extend it rather than fork it. `next build` type-checks `*.test.ts`, so a pre-build test importing a missing module fails the build (qa must expect that). React escapes `'` → `&#x27;` and `&` → `&amp;`; strings checked by grep must be one text node. The `minimal` header's "Back to catalog" `TEXT_LINK` has no `min-h-12`. Global `:focus-visible` lives outside every `@layer` in `globals.css` on purpose.
- P03 open for the human: the title-area decoration may overlap the title text just above `md` (~768px), and npm flipped `@types/react` / `csstype` to `devOptional` in the lockfile when adding lucide-react.
- P04: `next` must survive the round trip `/products/<slug>` → `/login?next=…` → back to the product, including through the `?error=missing` redirect. `/login` exports `instant = false`. `not-found.tsx` gets no props, so its copy does not echo the slug.
- P05: the island receives the current layout only and renders real links (no-JS fallback). Cards stay server components.

## Round and escalation log

| Phase | Round | Event | Outcome |
|---|---|---|---|
| 01 | 0 | qa pre-build: 103 tests in 4 files, all fail on missing modules | tests locked (`handoffs/phase-01/tests.sha`) |
| 01 | 1 | data-auth build: all 5 checks pass, no disputes; test lock intact | qa post-build PASS (109 tests) |
| 01 | 1 | reviewer: REVISE on R18 + G5 only (3 test files under `src/lib/**` lack `import "server-only";`); all else PASS | escalated: fix is in qa paths |
| 01 | 2 | human decision: qa adds the import to the 3 tests; R18 amended to cover colocated tests | qa dispute mode, then re-lock, post-build, review round 2 |
| 01 | 2 | qa dispute: added `import "server-only";` line 1 to 3 tests (no other change); re-locked; builder dispatch skipped (nothing in its paths); qa post-build PASS (109 tests); reviewer PASS on R1–R19, G1–G6 | closed, committed |
| 02 | 0 | qa pre-build: first dispatch cut off by an API error (machine slept) after 5 test files; re-dispatched with the same inputs. 142 tests in 6 files, all fail on missing modules only | tests locked (`handoffs/phase-02/tests.sha`) |
| 02 | 1 | data-auth build: 7 files, all 5 checks pass, no disputes; test lock intact | qa post-build PASS (251 tests: 109 P01 + 142 P02) |
| 02 | 1 | reviewer: PASS on R1–R19, G1–G6 | closed, committed |
| 03 | 0 | qa pre-build: 3 unit test files (54 tests) + `scripts/verify-ssr.sh` (~262 assertions over 13 page fetches); unit tests fail on missing modules / `lucide-react`; verify-ssr fails at build (test files are type-checked by `next build`) and, against the starter page, 134 FAIL / 128 PASS (absence checks) | tests locked (`handoffs/phase-03/tests.sha`, 15 files) |
| 03 | 1 | ui build: 6 files edited + 16 created under `src/components/`, all checks pass (verify-ssr 262/262), no disputes; test lock intact | qa post-build PASS (305 unit tests, verify-ssr 262/262, R14 build OK) |
| 03 | 1 | reviewer: REVISE on R31 only (`:focus-visible` in `@layer base` loses to `.btn-pop` / `shadow-*` utilities; search input `focus:outline-none`); all else PASS | back to ui, round 2, fix input `review.md` |
| 03 | 2 | ui build: `:focus-visible` moved outside all `@layer`s, `focus:outline-none` removed from the search input; all checks pass; test lock intact | qa post-build PASS (305 unit, verify-ssr 262/262, R14 build OK) |
| 03 | 2 | reviewer: PASS on R1–R33, G1–G6 | closed, committed |

## Human checks

| Phase | Result | Notes |
|---|---|---|
| Part 4 (agent system, 589dd98) | PASSED | Recorded at the start of the phase 01 thread. The thread started from a pasted prompt rather than `/phase`, so the orchestrator path-guard hook was not registered; the orchestrator kept to its Paths table by hand (see `docs/intervention-log.md`) |
| 01 auth core (bb5be94) | PASSED | Recorded at the start of the phase 02 thread. Again started from a pasted prompt (placeholder `Human check:` line; the human answered PASSED when asked), so the orchestrator path-guard hook is not registered this thread either |
| 02 data layer (04e62d2) | PASSED | Recorded at the start of the phase 03 thread. Started from a pasted prompt again (Human check line filled in this time), so the orchestrator path-guard hook is not registered; Paths kept by hand |
| 03 catalog | pending | Steps in `handoffs/phase-03/human-check.md` |
