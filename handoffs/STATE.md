# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent edits this file, and the reviewer never reads it (D-024). Seeded manually in Part 4. Phase plan from D-026.

## Current

| Field | Value |
|---|---|
| Phase | 02 data layer (next; 01 auth core done, awaiting human check) |
| Status | not started <!-- not started / spec / build / review / done / escalated --> |
| Build round | 0 of 3 |
| Base commit | <set by the orchestrator when the phase starts: `git rev-parse --short HEAD`> |
| Open escalation | none |

## Phase plan

Run in order, one phase per thread, each ending at the human gate (D-026).

| Phase | Builder | Builds | qa writes first (D-025) | Status | Commit |
|---|---|---|---|---|---|
| 01 auth core | data-auth | `src/lib/session.ts` (sign/verify, set/delete cookie), `src/lib/auth/actions.ts` (login/logout, zod, safe `next`), `src/proxy.ts` (optimistic redirects), `SESSION_SECRET` in `.env.example` | Unit: token round-trip, tampered and expired tokens rejected, missing/short secret throws, empty name rejected, `next` validation (`//evil.com` and `https://…` rejected, `/products/x` accepted) | done (2 rounds used) | `feat(auth): phase 01 - auth core` |
| 02 data layer | data-auth | Mock and live adapters, source selection + one log line, `fetchProducts` (`'use cache'`), `src/lib/dal.ts` (`verifySession`, `getProducts`, `getProductBySlug`), pure `filterProducts` | Unit: logged out never returns `authenticated`, logged in returns both sets, slug results (product / requires login / not found), category, `q` and combined filters, `https:` prefix on live image URLs, empty `CONTENTFUL_*` selects mock | not started | |
| 03 catalog | ui | Design tokens + fonts + root layout/footer, site header (both variants, sign-out form), banner, `/` with `instant = false`, both card variants (Set B mixed in with "Members only" badge), price, image placeholder, filter card (search form, category links, layout links, count, Clear filters), empty state, `next.config.ts` images, `lucide-react` (`docs/design.md`) | `scripts/verify-ssr.sh`: both directions with a self-minted cookie, no `<div hidden id="S:`, no `<!--$?-->`, no fallback text, a filtered URL renders filtered HTML | not started | |
| 04 detail + login | ui | `/products/[slug]` (307 to `/login?next=`, `notFound()` + `not-found.tsx`), `/login` page with `?error=missing` alert (`docs/design.md`) | Extend verify-ssr.sh (unknown slug 404, Set B slug 307 with `next`, logged-in detail price); add `playwright.config.ts` + browser install; e2e: login → Set B visible → logout | not started | |
| 05 layout toggle | ui | Client island in `src/components/client/` replacing the P03 layout links (still real links without JS), `data-layout` on the grid, `group-data` switching, `history.replaceState` URL sync | e2e: toggle reorders cards with no navigation/reload; JS disabled: `?layout=specs` renders specs-first | not started | |
| 06 release check | qa only | Runs every check against `next build && next start`, incl. the JS-disabled Playwright project | (none: no builder). Each failure becomes `phase-NN-fixK` for the owner of the failing path | not started | |

### Phase notes for spec writing

- P01: the cookie name (`session`), payload (display name + expiry) and flags are fixed by architecture.md Auth. Pick and record the export names in the spec contract; P02 and P03 depend on them. The login action reads form fields `username`, `password` and `next`; both trimmed values must be non-empty, the password is discarded, and empty input redirects to `/login?error=missing` (keeping `next`). Logout redirects to `/`.
- P01 contract as built (P02/P03/P04 call these): `src/lib/session.ts` exports `SESSION_COOKIE` (`"session"`), `SESSION_TTL_SECONDS`, `type Session = { name: string; expiresAt: Date }`, `signSession(name)`, `verifySessionToken(token)`, `createSession(name)`, `deleteSession()`. `src/lib/auth/next-path.ts` exports `safeNextPath(value): string | null`. `src/lib/auth/actions.ts` exports `login(formData)` and `logout()` with function-level `"use server"` (callers must be server components). `src/proxy.ts` matches `/login` only. `verifySessionToken` throws when `SESSION_SECRET` is missing or short, even for a missing token, so every check that starts a server must set its own secret.
- P02: `verifySession()` reads `(await cookies()).get(SESSION_COOKIE)?.value` and calls `verifySessionToken`, wrapped in React `cache`. Do not re-implement JWT verification.
- P03: the sign-out form is the first place Next compiles `actions.ts`'s function-level `"use server"` through its server-action transform. If the build rejects it, escalate (don't move to a file-level directive without a decision, because of the `server-only` first-line rule).
- P02: `getProductBySlug` must return a discriminated result (product / requires login / not found) so P04 can redirect or call `notFound()` without re-checking the session. The DAL also resolves which price applies (e.g. `price` + `priceTier: "everyday" | "member"` per product), so pages never pick a price from the session and a logged-out render never holds a member price. `q` matches name, description and features, case-insensitive, trimmed.
- P03: copy every string the checks rely on from `docs/design.md` into the spec contract: price format (`$11.20`), price labels ("Everyday price" / "Member price"), the "Members only" badge, banner sentences, count text, empty-state text. Set B is mixed into the one grid with the badge (no separate section). The spec lists `lucide-react` as the allowed `package.json` change and the font swap (Outfit + Plus Jakarta Sans). The logged-in direction uses a cookie minted by the script, not the login UI.
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

## Human checks

| Phase | Result | Notes |
|---|---|---|
| Part 4 (agent system, 589dd98) | PASSED | Recorded at the start of the phase 01 thread. The thread started from a pasted prompt rather than `/phase`, so the orchestrator path-guard hook was not registered; the orchestrator kept to its Paths table by hand (see `docs/intervention-log.md`) |
| 01 auth core | pending | Steps in `handoffs/phase-01/human-check.md` |
