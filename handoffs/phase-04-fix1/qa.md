# Phase 04-fix1: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `R1: MEMBERS_ONLY_SLUGS_TTL_MS is 5 * 60 * 1000`; `R1: isMembersOnlySlug returns a Promise`; `R1: authenticated slug %s resolves true` (x4, slugs read from the mock); `R1: public slug %s resolves false` (x8); `R1: unknown slug no-such-toy resolves false`; `R1: every slug resolves correctly from one module instance (warm cache)`; `R1: the mock source fetches with exactly ['authenticated']`; `R1: the mock source never calls the contentful adapter`; `R1: the contentful source fetches with exactly ['authenticated'] and never calls the mock adapter`; `R1: the contentful source answers from the contentful adapter's slugs, not the mock data`; `R1: the empty string resolves false without fetching`; `R1: pattern-failing %j resolves false without fetching` (x8); `R1: a pattern-failing slug resolves false even when the adapter would fail` | `src/lib/products/members-only.test.ts` |
| R2 | `R2: many sequential calls within the TTL trigger exactly one adapter fetch`; `R2: concurrent calls on a cold cache trigger exactly one adapter fetch`; `R2: concurrent calls on a cold cache all resolve to the right answer`; `R2: a call just before the TTL expires is still served from the cache`; `R2: the first call after the TTL expires fetches again`; `R2: after a refetch the new list is cached again for the next TTL window`; `R2: a refetch after expiry uses the new list (a product moved out of Set B)`; `R2: the first fetch logs exactly one console.info line '[products] members-only slugs loaded: 4'`; `R2: the loaded line is written only through console.info`; `R2: cached calls write no further loaded line`; `R2: concurrent calls on a cold cache write exactly one loaded line`; `R2: each refetch after expiry logs one more loaded line with the new count`; `R2: the count comes from the active source (contentful returning 2 entries logs 2)`; `R2: a pattern-failing slug on a cold cache logs no loaded line`; `R2: no console output contains a slug, a product name or a CONTENTFUL_* value` | `src/lib/products/members-only.test.ts` |
| R3 | `R3: if the adapter fetch rejects, isMembersOnlySlug rejects`; `R3: a rejected fetch is not cached as false: the next call fetches again and resolves true`; `R3: a rejected fetch for a public slug rejects too (no silent false)`; `R3: concurrent callers waiting on a rejected fetch all reject`; `R3: a rejected fetch logs no loaded line`; `R3: the contentful adapter rejecting makes isMembersOnlySlug reject, and the next call retries` | `src/lib/products/members-only.test.ts` |
| R4 | unit: `R4: /products/<Set B slug> with $label redirects 307 to /login?next=/products/<slug>` (x7: no cookie, garbage, empty, expired, other secret, tampered, valid token under another cookie name); `R4: every Set B slug redirects without a session (%s)` (x4); `R4: the redirect keeps a non-default request origin`; `R4: a query string on the product URL is not carried into the redirect`; `R4: the redirect works when the session cookie sits among other cookies but is invalid` | `src/proxy.test.ts` |
| R4 | verify-ssr: `R4: [<label>] Set B detail status 307` / `... Location resolves to /login?next=/products/forest-friends-activity-cube` / `... 307 body has no product name` / `... has no member price $71.20` for garbage cookie, expired cookie, valid token under another cookie name, 2nd and 3rd no-cookie request; `R4: GET /products/heirloom-wooden-xylophone (no cookie) status 307` + Location + no name | `scripts/verify-ssr.sh` |
| R5 | `R5: /products/<Set B slug> with a valid session passes through`; `R5: with a valid session isMembersOnlySlug is not called at all (Set B slug)`; `R5: with a valid session among other cookies isMembersOnlySlug is not called (public slug)`; `R5: no session + public slug passes through`; `R5: no session + unknown slug passes through`; `R5: no session + pattern-failing slug passes through`; `R5: a garbage session cookie + public slug passes through`; `R5: no session + a slug the helper reports false passes through even if it looks Set B-like` | `src/proxy.test.ts` |
| R6 | `R6: /login with a valid session cookie redirects 307 to / on the request origin`; `R6: the /login redirect keeps a non-default request origin`; `R6: the /login redirect goes to / and ignores ?next`; `R6: a valid session cookie is found among other cookies on /login`; `R6: /login with $label passes through` (x7); `R6: /login?next=/products/<Set B slug> without a session passes through`; `R6: /login without a session never calls isMembersOnlySlug`; `R6: /login with a valid session never calls isMembersOnlySlug`; `R6: /login with a garbage session cookie never calls isMembersOnlySlug` (these replace the phase 01 R14/R15 tests in the same file) | `src/proxy.test.ts` |
| R7 | `R7: if isMembersOnlySlug rejects, the proxy resolves (does not throw)`; `R7: if isMembersOnlySlug rejects, the request passes through (no redirect, no 500)`; `R7: a rejection for one request does not stop the next request from redirecting` | `src/proxy.test.ts` |
| R8 | `R8: config is exactly { matcher: ['/login', '/products/:slug'] }` (`toStrictEqual`, so no extra keys such as `runtime`; replaces phase 01 R16) | `src/proxy.test.ts` |
| R9 | `R9: the proxy never calls cookies() from next/headers on /products/<slug>`; `R9: the proxy never calls cookies() from next/headers on /login`; `R9: isMembersOnlySlug is called exactly once, with the slug from the pathname`; `R9: the slug comes from the pathname, not from the query string`; `R9: a session passed in a header other than Cookie is ignored` (plus the file-level `next/headers` mock that throws) | `src/proxy.test.ts` |
| R10 | `R10: GET /products/forest-friends-activity-cube (no cookie) status 307`; `R10: Location resolves to /login?next=/products/forest-friends-activity-cube on the request origin`; `R10: 307 body has no product name` / `no everyday price $89.00` / `no member price $71.20` / `no description`; `R10: GET /products/cloud-bunny-plush (no cookie) status 200`; `R10: ... has no Location header`; `R10: GET /products/forest-friends-activity-cube (session) status 200`; `R10: ... (session) contains $71.20` (the existing P04 R3 leak guards are kept as they were) | `scripts/verify-ssr.sh` |
| R11 | 7 requests for Set B slugs without a valid session (`detail_ffac_anon`, `_badcookie`, `_expired`, `_othername`, `_anon_2`, `_anon_3`, `detail_hwx_anon`), then `R11: server log has exactly one '[products] members-only slugs loaded:' line`; `R11: that line reads '[products] members-only slugs loaded: 4' (count only, no slug)` | `scripts/verify-ssr.sh` |
| R12 | `R12 (P04 R17): login from a members-only product redirect reveals Set B pricing, logout hides it again`: `/login` URL check is a predicate (pathname `/login`, only param `next`, decoded `next` = detail path); the post-login check is `toHaveURL(url => url.pathname === DETAIL_PATH)`, then the product `h1` must render and the pathname is re-asserted before and after the `Member price` / `$71.20` / `Members only` checks; sign out ends on pathname `/` | `e2e/login.spec.ts` |
| R13 | covered by running every existing check post-build (command) | all |

Requirements verified only by `review`: R14 (and the review half of R9).

How the tests were validated (not part of the deliverable): I wrote a throwaway reference `members-only.ts` and `proxy.ts` in the session scratchpad, outside the repo, and ran both unit files against them through a scratch Vitest config. All 51 + 46 pass. Then I tried mutants: no in-flight dedupe failed 2 R2 tests; no TTL expiry failed 4 R2 tests; looking up the slug before checking the session failed R5/R9; no try/catch around the lookup failed all 3 R7 tests. An unencoded `?next=/products/<slug>` still passes, which is right, because the spec allows either encoding. A `performance.now()`-based TTL also passes, because fake timers advance it too.

**Run output (trimmed):**

```
$ npx vitest run src/lib/products/members-only.test.ts
 FAIL  ... > R1: MEMBERS_ONLY_SLUGS_TTL_MS is 5 * 60 * 1000
Error: Cannot find package '@/lib/products/members-only' imported from .../src/lib/products/members-only.test.ts
 ... (same error for every test)
      Tests  51 failed (51)

$ npx vitest run src/proxy.test.ts
 FAIL  R4: /products/<Set B slug> with no cookie redirects 307 to /login?next=/products/<slug>   (x7 cookie cases, x4 slugs, origin, query, mixed cookies)
 FAIL  R5: /products/<Set B slug> with a valid session passes through
        AssertionError: expected 'http://localhost:3000/' to be null
 FAIL  R5: with a valid session among other cookies isMembersOnlySlug is not called (public slug)
        AssertionError: expected 'http://localhost:3000/' to be null
 FAIL  R7: a rejection for one request does not stop the next request from redirecting
 FAIL  R8: config is exactly { matcher: ['/login', '/products/:slug'] }
        expected { matcher: [ '/login' ] } to strictly equal { matcher: [ '/login', …(1) ] }
 FAIL  R9: isMembersOnlySlug is called exactly once, with the slug from the pathname
 FAIL  R9: the slug comes from the pathname, not from the query string
        AssertionError: expected [] to strictly equal [ [ 'cloud-bunny-plush' ] ]
 FAIL  R9: a session passed in a header other than Cookie is ignored
      Tests  21 failed | 25 passed (46)

$ npm test
 Test Files  2 failed | 13 passed (15)
      Tests  72 failed | 318 passed (390)      (51 members-only + 21 proxy; every other file passes)

$ npm run typecheck
src/lib/products/members-only.test.ts(95,17): error TS2307: Cannot find module '@/lib/products/members-only' or its corresponding type declarations.

$ npx eslint src/proxy.test.ts src/lib/products/members-only.test.ts e2e/login.spec.ts
(clean, exit 0)

$ npm run build            (via scripts/verify-ssr.sh)
src/lib/products/members-only.test.ts(95,17): error TS2307: Cannot find module '@/lib/products/members-only' ...
Failed to type check.
FAIL: setup: npm run build succeeds

# To get past that, I moved members-only.test.ts out of the tree for one build only and restored it right after.
$ VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh
FAIL: R10: GET /products/forest-friends-activity-cube (no cookie) status 307
FAIL: R10: Location resolves to /login?next=/products/forest-friends-activity-cube on the request origin
FAIL: R4: [garbage session cookie] Set B detail status 307
FAIL: R4: [garbage session cookie] Location resolves to ...
FAIL: R4: [expired session cookie] ...                      (status + Location)
FAIL: R4: [valid token under another cookie name] ...       (status + Location)
FAIL: R4: [no cookie, second request] ...                   (status + Location)
FAIL: R4: [no cookie, third request] ...                    (status + Location)
FAIL: R4: GET /products/heirloom-wooden-xylophone (no cookie) status 307
FAIL: R4: Location resolves to /login?next=/products/heirloom-wooden-xylophone
FAIL: R11: server log has exactly one '[products] members-only slugs loaded:' line
FAIL: R11: that line reads '[products] members-only slugs loaded: 4' (count only, no slug)
verify-ssr: 594 passed, 16 failed
(actual: every Set B request got 200 with no Location; server.log only has "[products] source: mock")

$ npx playwright test e2e/login.spec.ts --project=chromium
  ✘ R12 (P04 R17): login from a members-only product redirect reveals Set B pricing, logout hides it again
    Error: expect(locator).toBeVisible() failed
    Locator: getByRole('heading', { name: 'Forest Friends Activity Cube', level: 1 })
    Error: element(s) not found
    (page snapshot: logged in as playwright-user, on the catalog "Toy catalog" at /, not the product)
  1 failed
```

**Why each failure is the expected one:**

- `members-only.test.ts` (51) and the typecheck TS2307 fail because the module `@/lib/products/members-only` doesn't exist yet. Every test reaches the module through `fresh()` (dynamic import after `vi.resetModules()`), so a missing module is the only failure. Against a scratch reference implementation, all 51 pass.
- `proxy.test.ts` (21 failing) fails because the current proxy only knows `/login`:
  - The matcher is `['/login']` (R8).
  - It never calls the helper (R4, R9), so no Set B request is redirected.
  - It redirects any valid-session request to `/`, whatever the path. That is why the two R5 "valid session passes through" tests fail.
- The 25 proxy tests that pass pre-build are regression guards for behaviour the current proxy already has:
  - R6: `/login` unchanged.
  - R5: no-session pass-through for public, unknown and pattern-failing slugs, plus "helper not called with a valid session".
  - R7: fail open.
  - R9: `cookies()` is never called.
  
  The current proxy passes them trivially because it never looks at `/products/*` or the helper. Each one fails on a plausible wrong build (see the mutants above), so they are not dead checks.
- `npm run build` fails pre-build only because the build typechecks the test files (the same TS2307). It goes away once the module exists.
- verify-ssr (16 failing): today a logged-out Set B request gets 200 from the page (the old client-side redirect), not a 307 from the proxy. Nothing loads the slug list, so the R11 log line is missing. Every other assertion (594) still passes, so the script itself works. The existing P04 R3 leak guards and the new R10 body guards pass because the body has no product data.
- e2e R12: after signing in, the browser lands on `/` (the catalog, logged in) instead of the product. This is the OI-1 / R17 bug.
  - On the first run (before I added the `h1` check), `toHaveURL(pathname === DETAIL_PATH)` passed on a transient match: the browser passes through the product URL and then moves on to `/`. The test then failed on a strict-mode violation (13 `Member price` labels on the catalog).
  - I made the test assert that the product `h1` has rendered and re-assert the pathname afterwards, so the failure now points at the real problem: the product page never stays rendered.

## Post-build

The locked test files are unchanged: `shasum -a 256` of every path in `tests.list` matches `tests.sha` (21/21). I ran every check from the repo root, in the order below.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit`, `✓ Types generated successfully`, exit 0 |
| `npm run lint` | PASS | `eslint`, no output, exit 0 |
| `npm test` | PASS | `Test Files 15 passed (15)`, `Tests 390 passed (390)`, none skipped. The phase's own files on their own: `src/proxy.test.ts` + `src/lib/products/members-only.test.ts`, `97 passed (97)` (46 + 51) |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected`, exit 0 |
| `npm run build` | PASS | `✓ Compiled successfully`, TypeScript OK, routes `ƒ /`, `ƒ /login`, `◐ /products/[slug]`, `ƒ Proxy (Middleware)`, exit 0 |
| `scripts/verify-ssr.sh` | PASS | Its own build (CONTENTFUL_* blank, own SESSION_SECRET) on :3210. `verify-ssr: 610 passed, 0 failed`, exit 0. Includes `R10: GET /products/forest-friends-activity-cube (no cookie) status 307`, `R10: Location resolves to /login?next=/products/forest-friends-activity-cube on the request origin`, the four R10 307-body leak guards, the R4 307 cases (garbage, expired, other-name cookie, 2nd/3rd no-cookie request, `heirloom-wooden-xylophone`), `R10: ... cloud-bunny-plush (no cookie) status 200` + no Location, `R10: ... (session) status 200` + `$71.20`, `R11: server log has exactly one '[products] members-only slugs loaded:' line`, `R11: that line reads '[products] members-only slugs loaded: 4'` |
| `npm run test:e2e` | PASS | `17 passed (3.9s)` (13 chromium, 4 chromium-no-js), exit 0. `R12 (P04 R17): login from a members-only product redirect ...` passed. Flake check: `npx playwright test e2e/login.spec.ts --project=chromium --repeat-each=5` gave `5 passed` |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (unit: all R1 tests in `members-only.test.ts`) |
| R2 | PASS (unit: all R2 tests) |
| R3 | PASS (unit: all R3 tests) |
| R4 | PASS (unit `proxy.test.ts` R4 tests + verify-ssr R4/R10 307 assertions) |
| R5 | PASS (unit) |
| R6 | PASS (unit) |
| R7 | PASS (unit) |
| R8 | PASS (unit, `toStrictEqual`) |
| R9 | PASS (unit half; the review half is the reviewer's) |
| R10 | PASS (verify-ssr) |
| R11 | PASS (verify-ssr: 7 Set B requests without a valid session, exactly one loaded line, count 4. The in-memory cache holds across proxy invocations under `next start`, so the spec's escalation condition does not apply) |
| R12 | PASS (e2e, plus 5/5 on repeat) |
| R13 | PASS (every check above is green) |
| R14 | review only, not checked by qa |

**Overall:** PASS

## Dispute

**Disputed test:** `e2e/login.spec.ts`, "R12 (P04 R17): …", old lines 44–45 (`getByText("Signed in as").toHaveCount(0)` and `getByText("Forest Friends Activity Cube").toHaveCount(0)` after Sign out).

**Decision: the test was wrong. Fixed. The fix makes the checks visibility-aware and adds stronger ones. Nothing was weakened.**

**Reason (from the spec and architecture.md only):**

- Spec R12 says "Sign out → `/` logged out". architecture.md Routes and Auth define "logged out" as the session state: no valid `session` cookie, and `/` renders Set A only, with the "Sign in" button in the header. architecture.md Tests puts the both-directions absence rule on the **HTTP response body**, which verify-ssr checks. Neither document asks for the client DOM to hold no trace of a route the user saw while signed in.
- The old assertions counted hidden DOM. Architecture.md Stack turns Cache Components on. With it on, Next keeps the previous route mounted under a hidden `<Activity>` (`display: none`) after client navigation. Sources: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md` "Navigation with Activity", and `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md` "Testing": "Assertions may match hidden content. Be explicit about visibility". So the old lines failed on a correct build, because of a framework behaviour the spec does not cover.
- I checked the builder's claim myself with a scratch probe against `next start`, outside the repo. Counts were:

  | Check | Logged in | After Sign out | After reload |
  |---|---|---|---|
  | `Signed in as`, all DOM | 1 | 1 | 0 |
  | `Signed in as`, visible | 1 | 0 | 0 |
  | Product name, all DOM | 2 | 2 | 0 |
  | Product name, visible | 2 | 0 | 0 |
  | `Member price`, visible | 1 | 0 | 0 |
  | `Sign in` link | 0 | 1 | 1 |
  | `session` cookie | yes | no | no |

  The only matches after Sign out are hidden. The visible-filtered checks are live: each one is non-zero while logged in.

**What the test asserts now, after Sign out:**

- Pathname `/`, as before.
- On the visible page:
  - the `Sign in` link is visible
  - there is no visible `Signed in as`
  - there is no `Sign out` button (`getByRole`, which ignores hidden elements)
  - there is no visible product name, `Member price` or `$71.20`
- There is no `session` cookie left in the browser context.
- After `page.reload()`, which gives a fresh server document with no hidden route kept:
  - the `Sign in` link is visible
  - `Signed in as`, the product name and `$71.20` each have a **whole-DOM** count of 0.

  This last step keeps the original strict, not-visibility-aware absence check. It now runs against a document the server rendered after logout.

**Run after the fix**, on a fresh `npm run build` with CONTENTFUL_* blanked:

```
$ npx eslint e2e/login.spec.ts            -> clean
$ npm run typecheck                       -> clean
$ npx playwright test e2e/login.spec.ts --project=chromium
  ✓ R12 (P04 R17): login from a members-only product redirect reveals Set B pricing, logout hides it again
  1 passed
$ npm run test:e2e
  17 passed (3.3s)
```

No change to `src/**`.

## Open issues

- **Post-build: I don't think any of my tests are wrong.** The pre-build items below still stand. The `npm run build` one is resolved: the build is green post-build.
- **Pre-build `npm run build` is red because of the new unit test.** `next build` typechecks `*.test.ts`, so `src/lib/products/members-only.test.ts` (TS2307) breaks the build until the builder creates the module. This is expected and goes away post-build. I ran verify-ssr and e2e pre-build against a build made with that one file set aside, then restored it.
- **Older checks conflict with D-031, outside this phase's scope.**
  - `scripts/verify-ssr.sh` still has the P03/P04 "R18" loop. It asserts that there is no `<div hidden id="S:`, no `<!--$?-->`, no `<template id="B:` and no `Loading` on every fetched page.
  - `playwright.config.ts` still has a `chromium-no-js` project, and there is `e2e/layout-toggle.nojs.spec.ts`.
  - Both contradict `agents/qa.md` (no streaming-wrapper assertions; no JS-disabled project) and architecture.md Tests.
  - They pass today because nothing streams yet (Suspense is phase 07, out of scope here). The spec does not list `playwright.config.ts` as mine for this phase, and changing the R18 loop is not asked for, so I left both alone. Phase 07 has to remove or rewrite them, or they will fail as soon as skeletons land.
- **Hidden Set B DOM after logout (from the dispute; not a test decision).**
  - After a client-side Sign out, the previous product route stays in the DOM, hidden, with the product name and member price. This is Next's Activity behaviour under Cache Components.
  - No spec or architecture.md rule covers client DOM after logout, so no test asserts on it.
  - If the human wants it gone, that needs an architecture decision first. Possible approaches: a hard navigation on logout, or a rule that the logout action refreshes or evicts the router cache. Then a test would follow.
- **R11 timing assumption.** The R11 check counts loaded-lines over the whole verify-ssr run. All fetches happen within a few seconds of server start, far inside the 5-minute TTL. If the fetch section ever takes longer than 5 minutes, a second line would legitimately appear.

## Where the instructions got in the way

- `agents/qa.md` pre-build step 3 says each new check "must fail" before the build. Some requirements here are partly "unchanged" or "pass-through" behaviour (R5 pass-through cases, R6, R7, R9 `cookies()`), and the current proxy already satisfies them. Those tests can only fail on a wrong build, not on the current code. I kept them as regression guards and checked them with mutants instead.
- The pre-build rule "Fix any test that fails for the wrong reason" depends on the build, but the build itself typechecks the new test files. To demonstrate the pre-build verify-ssr/e2e failures I had to set one test file aside for a single build. The role file doesn't mention this.
