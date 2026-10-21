# Phase 04-fix1: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/products/members-only.ts:1 (`import "server-only";`), :9 (`MEMBERS_ONLY_SLUGS_TTL_MS = 5 * 60 * 1000`), :18-19 (picks the adapter from `getProductSource()` and fetches `["authenticated"]`), :43-46 (`SLUG_PATTERN` is checked before any fetch, so `""` and strings that fail the pattern resolve `false`; otherwise it returns `slugs.has(slug)`) | |
| R2 | PASS | src/lib/products/members-only.ts:21 (cache set with `expiresAt = Date.now() + TTL`), :29 (served from cache while fresh), :30-35 (one shared `inFlight` promise for concurrent callers, cleared in `finally`), :23 (`console.info` of `[products] members-only slugs loaded: ${slugs.size}`, once per successful fetch, count only) | |
| R3 | PASS | src/lib/products/members-only.ts:19-21 (an await that rejects throws before `cached` is set, so `false` is never cached), :31-33 (`finally` clears `inFlight`, so the next call fetches again), :45 (the rejection reaches the caller) | |
| R4 | PASS | src/proxy.ts:17 (session read from `request.cookies` through `verifySessionToken`), :20-22 (`/products/` branch, slug taken from the pathname), :31-33 (`new URL("/login", request.url)`, `searchParams.set("next", "/products/" + slug)`, `NextResponse.redirect(url, 307)`), matching the Contract | |
| R5 | PASS | src/proxy.ts:21 (a valid session returns `NextResponse.next()` before `isMembersOnlySlug` is called), :30 (`!membersOnly` → `NextResponse.next()`); pattern-failing slugs resolve false in members-only.ts:44 | |
| R6 | PASS | src/proxy.ts:36-39 (the `/login` logic is unchanged context: a valid session gets a redirect to `new URL("/", request.url)`, so `?next` is dropped; otherwise `next()`); `isMembersOnlySlug` only runs inside the `/products/` branch, :20-34 | |
| R7 | PASS | src/proxy.ts:24-29 (try/catch around `isMembersOnlySlug`; on failure `membersOnly` stays `false`), :30 (pass-through, so no redirect and no 500) | |
| R8 | PASS | src/proxy.ts:43 `export const config = { matcher: ["/login", "/products/:slug"] };` | |
| R9 | PASS | src/proxy.ts:17 (`request.cookies.get(SESSION_COOKIE)?.value` → `verifySessionToken`), :18 (`request.nextUrl.pathname`), :1-4 (no `next/headers` import); covered by src/proxy.test.ts R9 cases (diff lines 1071-1115) | |
| R10 | PASS | scripts/verify-ssr.sh:553 (307), :554-555 (Location decoded by the R4 rule through `login_redirect_to`), :556-559 (body lacks name, `$89.00`, `$71.20`, description), :586 (cloud-bunny-plush logged out → 200), :589-590 (logged-in Set B → 200 with `$71.20`) | |
| R11 | PASS | scripts/verify-ssr.sh:331-335 (more logged-out Set B requests; 6 for `forest-friends-activity-cube` plus 1 for `heirloom-wooden-xylophone`, so at least 3), :593-594 (log has exactly one `[products] members-only slugs loaded:` line), :595-596 (line reads `... loaded: 4`); members-only.ts:29-35 gives the cache behaviour | |
| R12 | PASS | e2e/login.spec.ts:18-23 (pathname is `/login`, the only param is `next`, decoded value is the detail path), :34 (post-login check uses `url.pathname === DETAIL_PATH`, anchored), :37-41 (h1, `Member price`, `$71.20`, `Members only`), :47 (pathname is `/` after Sign out), :53-68 (logged-out state) | |
| R13 | PASS | The diff changes no `src/` file other than src/proxy.ts and members-only.ts. The only behaviour change is for logged-out Set B product requests (src/proxy.ts:20-34), which phase 04 R3 already required to end on `/login`. The command results are qa's (see Notes) | |
| R14 | PASS | The only builder files in the diff are src/proxy.ts and the new src/lib/products/members-only.ts. No other `src/lib/**`, `src/app/**`, `src/components/**`, `.env.example` or `package.json` change | |
| G1 | PASS | The other changed files are the qa-owned `e2e/login.spec.ts`, `scripts/verify-ssr.sh`, `src/proxy.test.ts` and `src/lib/products/members-only.test.ts` (spec, Owned paths) | |
| G2 | PASS | No `'use client'` anywhere in the diff | |
| G3 | PASS | No `instant = false`, no `loading.tsx`, no page or component changes. Suspense and skeletons are out of scope for this phase (spec, Out of scope) | |
| G4 | PASS | No `NEXT_PUBLIC_`. src/lib/products/members-only.ts:23 logs only the count. src/proxy.ts:28 logs a fixed message without the error object. No change to the session payload | |
| G5 | PASS | src/lib/products/members-only.ts:1 `import "server-only";`. The new test file src/lib/products/members-only.test.ts:1 also starts with it | |
| G6 | PASS | No client island is touched or imports anything new | |

Overall: PASS

Notes:
- **Set B data stays in the browser after sign-out (e2e/login.spec.ts:48-68).** The test's own comment says that with cacheComponents on, Next keeps the previous route mounted under a hidden `<Activity>` after client navigation. So after Sign out, the Set B product page (name, member price) is still in the DOM, hidden with `display: none`, until the next full page load.
  - qa changed the checks right after sign-out to count only visible elements (:56-58). The original checks of the whole DOM now run only after `page.reload()` (:63-68), backed by a check that the `session` cookie is gone (:60).
  - That fits R12 as written, but it is a weaker check than before. It means anyone using the same tab after sign-out can find Set B data by inspecting the page.
  - This is outside this spec and comes from the framework, so it is not a REVISE. The human may want to decide whether that is acceptable (shared-device case).
- **Six 307 responses now go through the shared check loops (R13).** verify-ssr adds six fetches that return 307 with an empty body (scripts/verify-ssr.sh:331-336), and `detail_ffac_anon` changes from 200 to 307.
  - The script header says pages from phase 04 on are added to `$FETCHED`, which feeds the R18 streaming loop and the P05 R14 loop. Those loops are not in the diff.
  - If either loop asserts that some markup is present, it will hit empty 307 bodies. qa's verify-ssr run is what settles R13.
- src/proxy.ts:20 relies on the matcher to keep the slug to one path segment. An encoded or multi-segment slug fails `SLUG_PATTERN` and passes through to the DAL. That is fine.
- The proxy's fail-open warning (src/proxy.ts:28) leaves out the error itself. That is good for G4, but it gives little to go on when diagnosing a failed Contentful lookup. This is a style point, not a requirement.

Where the instructions got in the way: R10 to R13 are proven by running commands (verify-ssr, e2e, the full check list), and a diff can never show the result. The reviewer rule says "insufficient evidence in diff → REVISE", but REVISE also means "the builder can fix it within its paths". Read literally, that would force a REVISE on every command-verified requirement in every phase, with nothing for the builder to fix. So I judged these on the implementation and test code in the diff, and left the run results to qa.

**Orchestrator decision:** close. (qa's post-build run settles R10–R13: verify-ssr 610/610, e2e 17/17.)
