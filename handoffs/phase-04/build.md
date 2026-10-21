# Phase 04: Build (ui, round 3)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/app/products/[slug]/page.tsx` | unchanged since round 2 (keeps `await connection()`, which the round-3 amendment allows) | R1-R11 |
| `src/app/products/[slug]/not-found.tsx` | unchanged since round 1 | R2, R16 |
| `src/app/login/page.tsx` | unchanged since round 1 | R12-R15 |
| `src/components/alert.tsx` | unchanged since round 1 | R15 |

ui changed no files this round. I added temporary diagnostic specs under `e2e/` (`zz-dbg.spec.ts`) to trace the R17 failure and deleted each one after its run. `e2e/**`, `scripts/verify-ssr.sh` and `playwright.config.ts` are as qa and the human left them.

## Fixes this round

| Fix input item | Action | Outcome |
|---|---|---|
| Round-3 amendment, R2/R3/R16: drop the server status, `Location` and server-HTML not-found checks | Nothing to do on the ui side. The verify-ssr removals are now in the tree | `scripts/verify-ssr.sh`: `380 passed, 0 failed` |
| Round-3 amendment, R2/R16 with JS enabled (`e2e/not-found.spec.ts`) | No change needed | Both tests pass |
| Round-3 amendment, "R17 is unchanged ... must pass" | Diagnosed the cause (see Open issues). No in-path fix exists, so I escalated | **Still FAIL** |

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully` |
| `npm run lint` | PASS | clean |
| `npm test` | PASS | `Test Files 14 passed (14)`, `Tests 305 passed (305)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | `ƒ /`, `○ /_not-found`, `ƒ /login`, `◐ /products/[slug]` |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 380 passed, 0 failed` |
| `npm run test:e2e` | **FAIL** | `1 failed, 2 passed`. R17, `e2e/login.spec.ts:23`, strict-mode violation: `getByText('Member price', { exact: true })` resolved to 13 elements, because the visible page is the logged-in catalog |

## Open issues

**Escalation: R17 fails because of a framework behaviour that ui cannot fix within its paths.** The test is correct. It catches a real user-facing bug.

What happens, from network, `history` and `fetch` traces in a production build:

1. A logged-out visitor opens `/products/forest-friends-activity-cube`. The route is `◐`, so `redirect()` runs on the client. Next's per-segment `RedirectBoundary` (`node_modules/next/dist/client/components/redirect-boundary.js`) catches it, and its `HandleRedirect` effect calls `router.replace("/login?next=...")`.
2. Under `cacheComponents`, the router does not unmount the old route. It keeps the `/products/forest-friends-activity-cube` subtree inside a hidden `<Activity>` keyed by its segment (`layout-router.js`, `bfcache-state-manager.js`, up to 3 entries per level). `cacheComponents.md` documents this: "Effects are cleaned up when a route is hidden, and recreated when it becomes visible again". While that subtree is hidden it still holds the stale tree that throws the redirect, so the boundary stays in its "redirect" state.
3. After sign-in, the `login` action redirects to `/products/forest-friends-activity-cube` (`x-action-redirect: ...;push`). The new detail content arrives, but it shows the same hidden Activity entry, which has the same key. The preserved `HandleRedirect` effect runs again and fires the old `router.replace("/login?next=...")`. Its `fetch` has the same call stack and the same `_rsc` hash as the original redirect.
4. `src/proxy.ts` sees a session on `/login` and returns a 307 to `/`. The visitor ends up on the catalog. The URL briefly matched the detail path, which is why line 22 passes and line 23 fails.

A control run confirms the cause. The bounce happens only if this document hit the client-side redirect earlier. I logged in directly at `/login` and then clicked the Forest Friends card: the detail page showed. I visited the Set B detail page logged out first, then logged in and clicked the same card: it bounced to `/`. So a visitor who is redirected to login from a members-only product can never open that product again in the same tab without a full reload.

There is no fix in ui's paths:

- Every segment key is derived from the URL. The "requires-login" render and the "found" render of the same slug always share an Activity entry, at the page level, the `[slug]` level and the `products` level alike. Moving the redirect into a `[slug]/layout.tsx` or a `template.tsx` keeps the same key (`template.md`: keyed by segment), so the problem stays.
- `<Suspense>`, `loading.tsx`, `'use client'` outside `src/components/client/`, `generateStaticParams` and proxy changes are all ruled out by the spec, the amendments or `agents/ui.md`.

Options for the human (each needs a decision, and most touch paths ui does not own):

1. A proxy redirect for Set B slugs without a session (`src/proxy.ts`, data-auth). The redirect then happens on the server before the route renders, so no client-side redirect boundary exists and R3 gets its real 307 back. The round-3 amendment ruled this out, so the human must lift that.
2. A hard navigation after sign-in, so the Activity cache is discarded. For example, `login` returns the safe `next` and a client island under `src/components/client/` calls `window.location.assign(next)`. This needs a `src/lib/auth/actions.ts` contract change plus a client island in P04, which is out of scope for this phase.
3. A server-side 307 for the route (make `/products/[slug]` `ƒ`). Rounds 1-2 showed that `instant = false` and `connection()` don't do this. `generateStaticParams` is the remaining lever, and it is ruled out.

I did not try any of these.

Carried over (nothing for ui to do):

- The R10 empty-`features` case has no mock fixture, so it is review-only.
- The R8 icon-circle row is review-only.

## Where the instructions got in the way

- The round-3 amendment accepts client-side `redirect()` / `notFound()` on `/products/[slug]` but keeps R17 as written. Those two conflict under `cacheComponents`. A client-side redirect in render leaves a stale `RedirectBoundary` in the route's preserved `<Activity>` entry, and that entry replays the redirect when the visitor returns to the same URL. Neither the bundled `redirect.md` nor `preserving-ui-state.md` mentions this interaction. `preserving-ui-state.md` only warns that hidden DOM can match test selectors, which is a separate effect.
- `docs/architecture.md` and `agents/ui.md` still describe `instant = false` as making this route render fully on the server. The round-3 amendment already notes this as a human follow-up. I did not edit either file.
