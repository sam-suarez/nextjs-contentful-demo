# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent edits this file, and the reviewer never reads it (D-024). Seeded manually in Part 4. Phase plan from D-026.

## Current

| Field | Value |
|---|---|
| Phase | 01 auth core |
| Status | not started <!-- not started / spec / build / review / done / escalated --> |
| Build round | 0 of 3 |
| Base commit | <set by the orchestrator when the phase starts: `git rev-parse --short HEAD`> |
| Open escalation | none |

## Phase plan

Run in order, one phase per thread, each ending at the human gate (D-026).

| Phase | Builder | Builds | qa writes first (D-025) | Status | Commit |
|---|---|---|---|---|---|
| 01 auth core | data-auth | `src/lib/session.ts` (sign/verify, set/delete cookie), `src/lib/auth/actions.ts` (login/logout, zod, safe `next`), `src/proxy.ts` (optimistic redirects), `SESSION_SECRET` in `.env.example` | Unit: token round-trip, tampered and expired tokens rejected, missing/short secret throws, empty name rejected, `next` validation (`//evil.com` and `https://…` rejected, `/products/x` accepted) | not started | |
| 02 data layer | data-auth | Mock and live adapters, source selection + one log line, `fetchProducts` (`'use cache'`), `src/lib/dal.ts` (`verifySession`, `getProducts`, `getProductBySlug`), pure `filterProducts` | Unit: logged out never returns `authenticated`, logged in returns both sets, slug results (product / requires login / not found), category, `q` and combined filters, `https:` prefix on live image URLs, empty `CONTENTFUL_*` selects mock | not started | |
| 03 catalog | ui | Design tokens + fonts + root layout/footer, site header (both variants, sign-out form), banner, `/` with `instant = false`, both card variants (Set B mixed in with "Members only" badge), price, image placeholder, filter card (search form, category links, layout links, count, Clear filters), empty state, `next.config.ts` images, `lucide-react` (`docs/design.md`) | `scripts/verify-ssr.sh`: both directions with a self-minted cookie, no `<div hidden id="S:`, no `<!--$?-->`, no fallback text, a filtered URL renders filtered HTML | not started | |
| 04 detail + login | ui | `/products/[slug]` (307 to `/login?next=`, `notFound()` + `not-found.tsx`), `/login` page with `?error=missing` alert (`docs/design.md`) | Extend verify-ssr.sh (unknown slug 404, Set B slug 307 with `next`, logged-in detail price); add `playwright.config.ts` + browser install; e2e: login → Set B visible → logout | not started | |
| 05 layout toggle | ui | Client island in `src/components/client/` replacing the P03 layout links (still real links without JS), `data-layout` on the grid, `group-data` switching, `history.replaceState` URL sync | e2e: toggle reorders cards with no navigation/reload; JS disabled: `?layout=specs` renders specs-first | not started | |
| 06 release check | qa only | Runs every check against `next build && next start`, incl. the JS-disabled Playwright project | (none: no builder). Each failure becomes `phase-NN-fixK` for the owner of the failing path | not started | |

### Phase notes for spec writing

- P01: the cookie name (`session`), payload (display name + expiry) and flags are fixed by architecture.md Auth. Pick and record the export names in the spec contract; P02 and P03 depend on them. The login action reads form fields `username`, `password` and `next`; both trimmed values must be non-empty, the password is discarded, and empty input redirects to `/login?error=missing` (keeping `next`). Logout redirects to `/`.
- P02: `getProductBySlug` must return a discriminated result (product / requires login / not found) so P04 can redirect or call `notFound()` without re-checking the session. The DAL also resolves which price applies (e.g. `price` + `priceTier: "everyday" | "member"` per product), so pages never pick a price from the session and a logged-out render never holds a member price. `q` matches name, description and features, case-insensitive, trimmed.
- P03: copy every string the checks rely on from `docs/design.md` into the spec contract: price format (`$11.20`), price labels ("Everyday price" / "Member price"), the "Members only" badge, banner sentences, count text, empty-state text. Set B is mixed into the one grid with the badge (no separate section). The spec lists `lucide-react` as the allowed `package.json` change and the font swap (Outfit + Plus Jakarta Sans). The logged-in direction uses a cookie minted by the script, not the login UI.
- P04: `next` must survive the round trip `/products/<slug>` → `/login?next=…` → back to the product, including through the `?error=missing` redirect. `/login` exports `instant = false`. `not-found.tsx` gets no props, so its copy does not echo the slug.
- P05: the island receives the current layout only and renders real links (no-JS fallback). Cards stay server components.

## Round and escalation log

| Phase | Round | Event | Outcome |
|---|---|---|---|
| | | | |

## Human checks

| Phase | Result | Notes |
|---|---|---|
| | | |
