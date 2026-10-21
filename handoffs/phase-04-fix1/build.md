# Phase 04-fix1: Build (data-auth, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/products/members-only.ts` | created: first line `import "server-only";`. Exports `MEMBERS_ONLY_SLUGS_TTL_MS = 5 * 60 * 1000` and `isMembersOnlySlug(slug): Promise<boolean>`, nothing else. A slug that fails `SLUG_PATTERN` (including `""`) returns `false` without fetching. Otherwise the call reads a module-level `{ slugs: Set, expiresAt }` cache that lasts for the TTL (timed with `Date.now()`). On a cold or expired cache it makes one fetch from the active source (`getProductSource()` picks `fetchContentfulProducts(["authenticated"])` or `fetchMockProducts(["authenticated"])`), and concurrent callers share that fetch through an in-flight promise. A successful fill logs one line, `console.info("[products] members-only slugs loaded: <n>")` (count only). A rejection propagates to every waiting caller and nothing is cached, so the next call fetches again. | R1, R2, R3 |
| `src/proxy.ts` | edited: the session is verified from `request.cookies` via `verifySessionToken`, as before. For a `pathname` starting with `/products/`: a valid session passes through and the helper is never called. With no valid session, `isMembersOnlySlug(slug)` is called with the slug taken from the `pathname`. `true` gives `NextResponse.redirect(url, 307)`, where `url = new URL("/login", request.url)` with `searchParams.set("next", "/products/" + slug)`. `false` passes through. A rejection is caught: the proxy logs one `console.warn` with no error detail and passes through (fails open). `/login` behaviour is unchanged. `config = { matcher: ["/login", "/products/:slug"] }`. | R4, R5, R6, R7, R8, R9 |

No other file changed: no other `src/lib/**` file, `src/app/**`, `src/components/**`, `.env.example` or `package.json` (R14). No new dependencies.

## Fixes this round

none

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit`: no errors |
| `npm run lint` | PASS | `eslint`: no output |
| `npm test` | PASS | `Test Files 15 passed (15)`, `Tests 390 passed (390)` (includes all 51 `members-only.test.ts` and 46 `proxy.test.ts`) |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | `Compiled successfully`; routes `ƒ /`, `ƒ /login`, `◐ /products/[slug]`, `ƒ Proxy (Middleware)` |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 610 passed, 0 failed`. Includes `PASS: R11: server log has exactly one '[products] members-only slugs loaded:' line` and `PASS: R11: that line reads '[products] members-only slugs loaded: 4' (count only, no slug)`, so the in-memory cache does hold across proxy invocations under `next start` |
| `npm run test:e2e` | FAIL (1 of 17, disputed test, see Open issues) | `16 passed`, `1 failed`: `login.spec.ts:10 R12 (P04 R17)`, failing at line 44 `expect(page.getByText("Signed in as")).toHaveCount(0)` with `Received: 1`. Every check before line 44 passes, including the R12 core: the 307 to `/login?next=…`, the post-login pathname `=== /products/forest-friends-activity-cube`, the `h1`, `Member price`, `$71.20`, `Members only`, and sign-out landing on pathname `/` |

## Open issues

- **Disputed test: `e2e/login.spec.ts` "R12 (P04 R17): login from a members-only product redirect reveals Set B pricing, logout hides it again", lines 44–45.**
  - Spec line: R12 says "Sign out → `/` logged out".
  - The app is logged out after sign-out: pathname `/`, the cookie jar is empty, and the visible header shows "Sign in". The assertions `getByText("Signed in as").toHaveCount(0)` (line 44) and `getByText("Forest Friends Activity Cube").toHaveCount(0)` (line 45) are not visibility-aware, so they also count hidden DOM.
  - Repro: a scratch Playwright script against `next start`, outside the repo. After sign-out the only `Signed in as` match is the previous product route's header. It has `offsetParent === null`, and Next keeps it mounted under a hidden `<Activity>` because `cacheComponents` is on.
  - The bundled docs describe exactly this:
    - `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md` ("Navigation with Activity": the previous route is set to `"hidden"` rather than unmounted).
    - `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md` §Testing: "Hidden Activity content has `display: none` but remains in the document … Assertions may match hidden content. Be explicit about visibility".
  - This step was never reached before this phase. Earlier, login landed on `/`, and sign-out from `/` to `/` leaves no other hidden route behind.
  - Suggested qa fix, which I have not made because `e2e/**` is not my path: make lines 44–45 visibility-aware, e.g. `page.getByText("Signed in as").filter({ visible: true })` or `expect(...).toBeHidden()`.
  - Fixing this test needs no change to `src/proxy.ts` or `src/lib/**`.
- **Observation for the orchestrator (outside my paths, not a test of this phase):** for the reason above, after sign-out the browser's DOM still holds the hidden previous route, including the Set B name and member price, until Next evicts it. It is not visible and is not in any new server response; the HTTP-level checks (verify-ssr) all pass. Whether that is acceptable after logout is a product/architecture decision (D-031 territory), not a data-auth change.
- **Proxy docs caveat (spec "Escalate" clause), checked, no escalation needed.** `proxy.md` says Proxy "should not attempt relying on shared modules or globals". The spec said to escalate only if R11 fails or the docs rule the cache out. The docs give that as general advice for CDN-deployed proxies rather than a ban, and R11 passes against `next start` (one loaded line for 7 Set B requests). The cache is still per server process: on a multi-instance or edge deployment each instance would load its own list.

## Where the instructions got in the way

- The spec allowed me only `src/proxy.ts` and `members-only.ts`, and `npm run test:e2e` is a required check. The single remaining e2e failure is in a qa-owned test, so I can't make every check green within my paths. I recorded it as a disputed test as `agents/data-auth.md` step 5 directs.
