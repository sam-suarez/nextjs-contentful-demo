# Phase 04: QA

## Pre-build

**Tests written:**

Every P04 requirement whose "Verified by" column includes `verify-ssr` or `e2e` got at least one check, added to `scripts/verify-ssr.sh` (extended) and the new `e2e/login.spec.ts` (run via the new `playwright.config.ts`). No requirement in this phase is `unit`-verified, so no new `*.test.ts` files were needed.

| Requirement | Check | File |
|-------------|-------|------|
| R1 | Behaviorally exercised by the R2-R6 checks below (status/redirect/404 outcomes). The page-only parts of R1 — `instant = false`, `await props.params`, and that the page itself never calls `verifySession()` — are code shape and are review-only (see "Requirements verified only by review") | `scripts/verify-ssr.sh` (indirect) |
| R2 | `R2: GET /products/no-such-toy status 404` / `renders the not-found screen`; `R2: GET /products/Not-Valid-Slug (fails SLUG_PATTERN) status 404` / `invalid-pattern slug also renders the not-found screen` | `scripts/verify-ssr.sh` |
| R3 | `R3: GET /products/forest-friends-activity-cube (no cookie) status 307`; `Location is /login?next=/products/forest-friends-activity-cube`; three `lacks` checks that the redirect body carries no name/price/description | `scripts/verify-ssr.sh` |
| R4 | `R4: GET ... status 200`; name/description/material/age-range present; `>Everyday price<` and `$28.00` exactly once; `>Member price<`/`$22.40`/`>Members only<` absent; secondary button `href=/login?next=/products/cloud-bunny-plush` + text; sentence `Members get lower prices on every toy.` | `scripts/verify-ssr.sh` |
| R5 | `R5: ... status 200`; `>Member price<` exactly once **in `text-accent-strong`**; `$22.40` exactly once; `>Everyday price<`/`$28.00`/`Sign in for member pricing` absent | `scripts/verify-ssr.sh` |
| R6 | `R6: ... status 200`; name, `>Member price<`, `$71.20` present; `>Members only<` exactly once; `<h1` exactly once; h1 text equals the product name exactly; badge follows the h1 (order) | `scripts/verify-ssr.sh` |
| R7 | Breadcrumb: `Catalog` → `href="/"`; `Plush` → `href="/?category=plush"`; order check `Catalog, Plush, Cloud Bunny Plush`; product name not wrapped in `</a>` | `scripts/verify-ssr.sh` |
| R8 | Blob-radius frame class present; `<img>` for Cloud Bunny Plush (`src`+`alt`); for Bubble Bath Whale: `Picture coming soon` exactly once and **no** `<img>` tag at all. (Icon-circle border/fill classes above the title are left to review — see below) | `scripts/verify-ssr.sh` |
| R9 | `>Age range<` / `>Material<` row labels present (values reused from the R4 content checks: `0 months+`, `Organic cotton, polyester fill`) | `scripts/verify-ssr.sh` |
| R10 | Heading `What makes it special`; every `features` entry present, for both Cloud Bunny Plush and Forest Friends Activity Cube; `bg-quaternary` (mint) fill on the check-icon circle. The negative case ("omitted when `features.length === 0`") has **no test**: no mock product has an empty `features` array — see "Open issues" | `scripts/verify-ssr.sh` |
| R11 | Exactly one `>Back to catalog<` on the detail screen; it links to `/` | `scripts/verify-ssr.sh` |
| R12 | `login_anon`: status 200 (not redirected without a session). `login_member`: status 307, `Location: /`, body has no `>Sign in<`. See "Open issues" — this redirect is already produced by P01's `proxy.ts` regardless of the page, so it does not discriminate "page implements R12" from "page is missing"; the page-level ordering (`verifySession()` before render) is review-only | `scripts/verify-ssr.sh` |
| R13 | `>Sign in<` exactly twice; `<h1>Sign in</h1>`; both sentences; `<form>` + `$ACTION_ID_` marker; username input (`name`,`placeholder=demo`,`required`); password input (`type=password`,`name`,`placeholder=Any password`,`required`); a submit button; `Continue browsing without signing in` → `/` | `scripts/verify-ssr.sh` |
| R14 | Valid `next`: hidden `input[type=hidden][name=next][value=/products/forest-friends-activity-cube]`; decline-link still `/`. Unsafe `next` (`//evil.com`, protocol-relative): no hidden `next` input. Missing `next`: no hidden `next` input | `scripts/verify-ssr.sh` |
| R15 | `/login?error=missing`: exactly one `role="alert"`; exact text `Enter a username and password to sign in.`; alert text precedes `name="username"` (order). `/login` and `/login?error=bogus`: no `role="alert"` | `scripts/verify-ssr.sh` |
| R16 | Checked against `/products/no-such-toy`'s rendered not-found screen: `>404<` exactly once; `bg-tertiary`; h1 text exactly `We can&#x27;t find that toy`; sentence `It may have been renamed or put back in the toy box.`; `>Back to catalog<` exactly twice (minimal header + primary button); a `Back to catalog` link to `/` | `scripts/verify-ssr.sh` |
| R17 | `R17: login from a members-only product redirect reveals Set B pricing, logout hides it again` — goto detail page logged out → redirected to `/login?next=...`; fill + submit → back on the detail page with `Member price`, `$71.20`, `Members only` visible; sign out → back on `/`, logged out | `e2e/login.spec.ts` |

Requirements verified only by `review`: **R18** (command, not a qa.md test — see Checks), **R19** (command + review), **R20** (review only — ownership/diff, no check to write). Structural parts of **R1**, **R8** (icon-circle styling), **R10** (negative/empty-features branch, no fixture exists) and **R12** (page's own `verifySession()` call and ordering, since P01's `proxy.ts` already produces the same HTTP outcome) are review-only; noted inline above and under "Open issues".

**Run output (trimmed):**

```
$ npm run typecheck   # PASS — no missing-import errors; qa's new files (playwright.config.ts,
                      # e2e/login.spec.ts) only import @playwright/test, so typecheck alone can't
                      # show the missing P04 app code. The real pre-build signal is verify-ssr/e2e below.
✓ Types generated successfully

$ npm run lint        # PASS, clean.

$ scripts/check-client-boundary.sh
OK: client boundary respected

$ npm run build       # PASS (CONTENTFUL_* blanked). Route (app): only "/" and "/_not-found" exist yet —
                      # /products/[slug] and /login are not built, confirming the phase hasn't started.
Route (app)
┌ ƒ /
└ ○ /_not-found

$ scripts/verify-ssr.sh   # (VERIFY_SSR_SKIP_BUILD=1, reusing the build above)
...
FAIL: R4: GET /products/cloud-bunny-plush (no cookie) status 200
FAIL: R4: contains product name 'Cloud Bunny Plush'
...
FAIL: R3: GET /products/forest-friends-activity-cube (no cookie) status 307
FAIL: R3: Location is /login?next=/products/forest-friends-activity-cube
PASS: R3: redirect body has no product name          # vacuously true: the 404 body has no product data either
...
FAIL: R6: contains product name
PASS: R6: '<h1' occurs exactly once                   # vacuously true: Next's generic 404 template also has one <h1>
FAIL: R6: h1 text is exactly the product name
...
FAIL: R12: GET /login (no session) status 200 (not redirected)
PASS: R12: GET /login (valid session) status 307       # see "Open issues": proxy.ts already does this
PASS: R12: Location is /
...
FAIL: R13: '>Sign in<' occurs exactly twice (h1 and submit button)
FAIL: R13: <form> present (server action)
...
FAIL: R15: exactly one role="alert" element
...
verify-ssr: 337 passed, 70 failed
verify-ssr: FAIL

$ npx playwright install chromium   # PASS, browser installed once.

$ npm run test:e2e
  ✘  1 [chromium] › e2e/login.spec.ts:8:5 › R17: login from a members-only product redirect ...
    Error: expect(page).toHaveURL(expected) failed
    Expected pattern: /\/login\?next=(%2Fproducts%2Fforest-friends-activity-cube|\/products\/forest-friends-activity-cube)$/
    Received string:  "http://127.0.0.1:3220/products/forest-friends-activity-cube"
  1 failed
```

**Why each failure is the expected one:**

- Every P04 route (`/products/[slug]`, `/login`, its `not-found.tsx`) is unbuilt: `npm run build`'s route list shows only `/` and the generic `/_not-found`. Requesting any `/products/<slug>` or `/login` path therefore falls through to Next's own generic 404 page, which is why every status/content assertion tied to the real screens (`R2`–`R16`) fails — `module not found` doesn't apply here (these are page routes, not imports), but the mechanism is the same: the code the check targets does not exist yet.
- `e2e/login.spec.ts` fails for the same reason: `goto('/products/forest-friends-activity-cube')` stays on that URL (serving the generic 404) instead of redirecting to `/login`, because the redirect-when-not-authorized logic lives in the not-yet-written `page.tsx`.
- A handful of checks already **pass** pre-build; all are either (a) vacuously true negative assertions (e.g. "the 404 body has no product data" — true before and after the real page exists) or (b) explicitly called out above as not discriminating missing-vs-built code (`R12`'s redirect-when-logged-in, already produced by P01's `proxy.ts`). None of these weaken the requirement; they stay in the Post-build check list and will still hold once the real pages exist.
- I fixed one test-authoring bug before finalizing: the pre-existing P03 "every catalog link keeps state" loop (`R20`, in `scripts/verify-ssr.sh`) iterated over the shared `$FETCHED` list. Adding the P04 fetches (detail/login/not-found pages) to that same list made the loop wrongly expect `>Clear filters<` and `href="/"` on pages that were never part of the catalog. Fixed by snapshotting `CATALOG_FETCHED="$FETCHED"` right after the P03 fetches and pointing that loop at the snapshot instead. The P04 pages still participate in the (correctly page-agnostic) `R18` no-streaming/no-fallback loop, which is supposed to run against every fetched page.

## Post-build

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully` |
| `npm run lint` | PASS | no output, clean |
| `npm test` | PASS | `Test Files 14 passed (14)` / `Tests 305 passed (305)` — no new `*.test.ts` this phase (no `unit`-verified requirement), matching pre-build |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS (builds), but see note | `Route (app)` lists `ƒ /`, `○ /_not-found`, `ƒ /login`, and `/products/[slug]` as `◐` **Partial Prerender** (not `ƒ` like `/` and `/login`) despite `export const instant = false`. Build itself reports no error. This foreshadows the `verify-ssr.sh`/`test:e2e` failures below |
| `scripts/verify-ssr.sh` | **FAIL** | `395 passed, 12 failed` |
| `npx playwright install chromium` | PASS (no-op) | chromium already cached |
| `npm run test:e2e` | **FAIL** | `1 failed` — R17 strict-mode violation, see below |

**`scripts/verify-ssr.sh` failures (12), verbatim:**

```
FAIL: R4: '$28.00' occurs exactly once
FAIL: R3: GET /products/forest-friends-activity-cube (no cookie) status 307
FAIL: R3: Location is /login?next=/products/forest-friends-activity-cube
FAIL: R5: '$22.40' occurs exactly once
FAIL: R2: GET /products/no-such-toy status 404
FAIL: R2: renders the not-found screen
FAIL: R2: GET /products/Not-Valid-Slug (fails SLUG_PATTERN) status 404
FAIL: R2: invalid-pattern slug also renders the not-found screen
FAIL: R16: '>404<' pill occurs exactly once
FAIL: R16: h1 text is exactly the not-found heading
FAIL: R16: 'Back to catalog' occurs exactly twice (minimal header + primary button)
FAIL: R16: a 'Back to catalog' link targets /
```

**Root-cause finding (R2, R3, R16 — real implementation bug, not a test bug):** `/products/forest-friends-activity-cube` with no cookie and `/products/no-such-toy` both return HTTP **200** with response header `x-nextjs-postponed: 1`, not the 307 / 404 the spec requires. I built and started the app manually (`CONTENTFUL_*` blanked, own `SESSION_SECRET`) and inspected the raw response body:

- For both the `requires-login` and `not-found` branches, the response body is an almost-empty shell (`<body><div hidden=""><!--$--><!--/$--></div><script>...</script>`) — no header, no `<h1>`, no "404" pill, no redirect `Location` header. The correct UI (the not-found screen's JSX tree, with the real, un-escaped text `We can't find that toy`) exists only *inside* a `<script>self.__next_f.push(...)</script>` flight payload meant for client-side hydration, never as real server-rendered HTML. A client with JavaScript disabled (or `curl`) sees a blank page with status 200, not the required 404/307.
- For the `found` branch (e.g. `/products/cloud-bunny-plush`, `/products/forest-friends-activity-cube` with a session), the same route *does* render full, real HTML with the price, name, etc. directly in `<body>` (verified by byte offset, not just substring match) — that is why R4–R6, R7–R11 mostly pass.
- This is reproducible and not a cold-start artifact (repeated `curl` to the same path gives the same result every time).
- `npm run build`'s route table marks `/products/[slug]` as `◐` (Partial Prerender) while `/` and `/login` (which also read the session) are `ƒ` (fully Dynamic). I read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`: `instant` is a **validation** control ("Validation runs during development... surfaces errors in the dev overlay") with a documented effect of also opting the route out of a *build-time static-shell validation*, but nothing in that file says it forces the segment to skip Partial Prerendering at runtime — and the `◐` marker in the production build (plus the `x-nextjs-postponed` header on every request to this route, even the ones that happen to resolve synchronously) says it didn't. `docs/architecture.md` ("If the build reports runtime data accessed outside `<Suspense>` ... the fix is `instant = false`") and `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` ("Set `export const instant = false` on the page or layout to let it keep blocking on the server") both read as if `instant = false` makes the page fully blocking in production, which contradicts what I observed. I'm flagging this as a disagreement between architecture.md's prescription and the framework's actual behavior rather than guessing at a different fix — see Open issues.
- **Caution for the reviewer:** several of the checks that did pass for the broken `not-found`/`redirect` branches (e.g. `bg-tertiary`, the "It may have been renamed..." sentence) use plain substring search (`has`), which also matches the same text sitting unrendered inside the flight-payload `<script>`. Their PASS does not confirm real server-rendered HTML; only the escape-sensitive and tag-structural checks (`h1_text_is`, `tag_count_is`, the HTML-entity apostrophe form) reliably caught the bug.

**`npm run test:e2e` failure, trimmed:**

```
✘ 1 [chromium] › e2e/login.spec.ts:8:5 › R17: login from a members-only product redirect ...
  Error: expect(locator).toBeVisible() failed
  Locator: getByText('Member price', { exact: true })
  Error: strict mode violation: getByText('Member price', { exact: true }) resolved to 13 elements
    ... (the catalog grid's 12 "Member price" cards, plus one more)
  at e2e/login.spec.ts:23:65
    22 |   await expect(page).toHaveURL(new RegExp(`${DETAIL_PATH}$`));
  > 23 |   await expect(page.getByText("Member price", { exact: true })).toBeVisible();
```

The URL assertion on line 22 passes (the browser's address bar shows `/products/forest-friends-activity-cube` after login), but the visible DOM still shows the catalog grid (13 "Member price" matches, consistent with the 12-card logged-in catalog plus one), not the detail screen. This is the client-side manifestation of the same server-side defect above: the client-side navigation into the Partial-Prerender/postponed route doesn't resolve to the real detail content. This is a genuine regression caught by the spec'd e2e test (R17), not a test-authoring problem — I did not change the test.

| Requirement | Result | Note |
|-------------|--------|------|
| R1 | FAIL | Code-shape parts (`instant = false`, `await props.params`, no `verifySession()` on this page) are review-only and look correct by inspection, but the behavioral contract ("branches on `.status`" producing the right HTTP response) fails for 2 of 3 branches — see R2, R3 |
| R2 | FAIL | Unknown/invalid-pattern slug returns 200, not 404; not-found screen isn't in the real server HTML (root-cause above) |
| R3 | FAIL | `forest-friends-activity-cube` with no cookie returns 200, not 307; no `Location` header (root-cause above). The three "no product data in body" assertions pass, but vacuously — there's no real body at all |
| R4 | FAIL (1 of 13 assertions) | All content/shape assertions pass. Only `'$28.00' occurs exactly once` fails, and I now think that assertion is wrong — see Open issues |
| R5 | FAIL (1 of 6 assertions) | Same as R4: only `'$22.40' occurs exactly once` fails, for the same reason |
| R6 | PASS | All assertions pass |
| R7 | PASS | All assertions pass |
| R8 | PASS (verify-ssr part); icon-circle styling review-only | |
| R9 | PASS | |
| R10 | PASS (both fixtures); negative/empty-features branch untestable — see pre-build Open issues | |
| R11 | PASS | |
| R12 | PASS; page-level `verifySession()` ordering review-only (non-discriminating check, flagged pre-build) | |
| R13 | PASS | |
| R14 | PASS | |
| R15 | PASS | |
| R16 | FAIL | Not-found screen's real markup (404 pill, h1, "Back to catalog" ×2) isn't present in server HTML for `/products/no-such-toy` — same root cause as R2 |
| R17 | FAIL | e2e test fails: post-login the visible DOM still shows the catalog grid, not the detail page, despite the URL already matching `/products/forest-friends-activity-cube` |
| R18 | PASS | `playwright.config.ts` exists, `test:e2e` runs it, `webServer.env` blanks the three `CONTENTFUL_*` vars and sets its own `SESSION_SECRET` — confirmed by reading the file |
| R19 | PASS | `scripts/check-client-boundary.sh` → `OK: client boundary respected`; confirmed no `'use client'` anywhere under `src/` and no `src/components/client/` directory |
| R20 | review only | Not a qa check (ownership/diff is the reviewer's job) |

**Overall: FAIL** — `scripts/verify-ssr.sh` and `npm run test:e2e` both fail; not every check passes.

### Post-build, round 3

The tables above are round 1 and are superseded by this subsection. Run on 2026-10-20 from the repo root. Every file in `tests.list` matched `tests.sha` before the run, and I edited no test. The round-3 removals in `scripts/verify-ssr.sh` (R3 status and Location, the R2 block, the R16 server-HTML block) are in the locked file.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`, exit 0 |
| `npm run lint` | PASS | exit 0, no output |
| `npm test` | PASS | `Test Files 14 passed (14)` / `Tests 305 passed (305)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | Exit 0. `ƒ /`, `○ /_not-found`, `ƒ /login`, `◐ /products/[slug]`. The round-3 amendment accepts `◐` |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 380 passed, 0 failed` |
| `npx playwright install chromium` | PASS (no-op) | already installed |
| `npm run test:e2e` | **FAIL** | `1 failed, 2 passed`. `e2e/not-found.spec.ts` passed 2 of 2 and `e2e/login.spec.ts` (R17) failed. Same failure as round 1: `strict mode violation: getByText('Member price', { exact: true }) resolved to 13 elements` at `e2e/login.spec.ts:23` |

**R17 diagnosis (genuine failure, not a test bug).** I drove the same flow with a throwaway `playwright-core` script against `npm start` (blanked `CONTENTFUL_*`, own `SESSION_SECRET`). The script is outside the repo and no test file was touched. Sequence of events:

1. `GET /products/forest-friends-activity-cube` with no cookie: the client-side redirect (round 3) lands on `/login?next=/products/forest-friends-activity-cube`. This part works.
2. Submitting the form: the server-action `POST` returns 200 with `x-action-redirect: /products/forest-friends-activity-cube;push`. The URL changes to the detail page, so `login()` and `next` work.
3. Immediately afterwards the client sends `GET /login?next=/products/forest-friends-activity-cube&_rsc=…` again. `proxy.ts` now sees a valid session and answers `307 Location: /`. The router follows it, so the final URL is `/` and the catalog grid is shown (12 member-price cards plus one, hence 13 matches).
4. With the same cookie, a direct visit to `/products/forest-friends-activity-cube` renders the detail page correctly (`h1` = `Forest Friends Activity Cube`).

So after sign-in the user never stays on the product: they end up on `/`. This breaks R17 ("submitting lands back on `/products/forest-friends-activity-cube` showing `Member price` and `$71.20` and the `Members only` badge"). My reading, not verified in framework source: the client router reuses the detail route's entry from the logged-out visit, whose `requires-login` branch is the client-side `redirect("/login?next=…")`. The router replays that redirect after the action's push, and the proxy then bounces the logged-in user from `/login` to `/`. This is a consequence of carrying `requires-login` in client JS under `◐`. It is an implementation and design issue for ui and the orchestrator, outside qa's owned paths. Possible fixes (for example, the action revalidating or refreshing the detail path) would touch `src/lib/**` or the page, so I am escalating without guessing.

| Requirement | Result | Note |
|-------------|--------|------|
| R1 | PASS (verify-ssr part) | The `found` branch renders on the server. The branching, `connection()` and no-`verifySession()` code shape are review-only. Per round 3, the non-`found` branches are client-side |
| R2 | PASS | Round-3 scope: e2e `/products/no-such-toy` and `/products/Not-Valid-Slug` show the R16 screen (`e2e/not-found.spec.ts`, 2 passed) |
| R3 | PASS | Round-3 scope: all 4 data-leak guards pass on the whole body, flight payload included. The redirect itself is exercised in R17 step 1, which works |
| R4 | PASS | Includes the round-2 amended price presence/absence checks |
| R5 | PASS | |
| R6 | PASS | |
| R7 | PASS | |
| R8 | PASS (verify-ssr part). The icon-circle styling is review-only | |
| R9 | PASS | |
| R10 | PASS (both fixtures). The empty-features branch is review-only (no mock fixture) | |
| R11 | PASS | |
| R12 | PASS. Page-level ordering is review-only, and the check does not discriminate (proxy) | |
| R13 | PASS | |
| R14 | PASS | |
| R15 | PASS | |
| R16 | PASS | Round-3 scope: JS-enabled e2e (404 pill, h1, sentence, two `Back to catalog` links to `/`) |
| R17 | **FAIL** | Post-login, the user ends on `/` instead of the detail page (diagnosis above) |
| R18 | PASS | `playwright.config.ts` webServer blanks `CONTENTFUL_*` and sets its own `SESSION_SECRET`. `test:e2e` runs it |
| R19 | PASS | `OK: client boundary respected` |
| R20 | review only | |

**Overall: FAIL.** `npm run test:e2e` fails on R17. Every other check passes.

## Dispute

Round 2. I decided each item from `spec.md` (including "Amendments (round 2, human decision 2026-10-20)") and `docs/architecture.md` only.

| Disputed check (build.md "Open issues") | Spec line | Decision | Reason |
|---|---|---|---|
| `R4: '$28.00' occurs exactly once` | R4, overridden by Amendments, R4/R5 bullet | **Test wrong, fixed.** Now `R4: contains '$28.00'` (`has`) | The amendment drops the exact-once count on bare price strings. Next repeats rendered strings in the hydration flight payload (`$` escaped as `$$`), so a bare substring always matches more than once. The amendment keeps presence of `$28.00` and absence of `$22.40`. The absence check was already there and is unchanged. The `>Everyday price<` exact-once count also stays. |
| `R5: '$22.40' occurs exactly once` | R5, overridden by Amendments, R4/R5 bullet | **Test wrong, fixed.** Now `R5: contains '$22.40'` (`has`) | Same amendment. Presence of `$22.40` and absence of `$28.00` (unchanged) are kept, and so is the `text-accent-strong">Member price<` exact-once count. |
| R3 status 307 + `Location` (no cookie, Set B product) | R3; Amendments, R1 bullet | **Test right, kept.** | The spec requires a real 307 with `Location: /login?next=/products/forest-friends-activity-cube`. The amendment adds `connection()` to get that status, so it does not relax the requirement. D-020 and architecture.md Routes need the outcome in the real HTTP response for no-JS clients. |
| R2 status 404 + not-found screen (`no-such-toy`, `Not-Valid-Slug`) | R2; Amendments, R1 and "Escalate again" bullets | **Test right, kept.** | The spec requires a real 404 and the R16 screen in the body. The amendment names R2 still failing as an escalation trigger, so the assertion stands as written. |
| R16 not-found screen checks (`>404<` once, h1 text, `>Back to catalog<` twice, link to `/`) | R16; Amendments, "Escalate again" bullet | **Test right, kept.** | These fail only because the not-found branch does not reach real HTML (same root cause as R2). The amendment names R16 as an escalation trigger, so the assertions do not change. |
| `e2e/login.spec.ts` R17 (URL matches the detail page but the DOM still shows the catalog) | R17 | **Test right, kept.** | It asserts the visible outcome the spec requires after login. The failure matches the R3 root cause. It is not a test bug. |

Files changed: `scripts/verify-ssr.sh`, two lines only (the R4 and R5 price checks above). No other assertion changed. `e2e/**` and `playwright.config.ts` are untouched. The R4/R5 rows in the Pre-build map above still say "`$28.00` / `$22.40` exactly once". Read them as superseded by this section. The orchestrator needs to re-lock `scripts/verify-ssr.sh` in `tests.sha`.

### Dispute, round 3

Decided from `spec.md` "Amendments (round 3, human decision 2026-10-20)", which overrides R2/R3/R16 and the round-2 amendments, plus `docs/architecture.md`.

| Disputed check | Spec line | Decision | Status |
|---|---|---|---|
| `R3: ... (no cookie) status 307`, `R3: Location is /login?next=...` | Round 3, R2/R3/R16 bullet ("drop the checks on HTTP status ... the `Location` header") | **Test now wrong per the amendment. Remove.** | **Not applied: blocked.** The permission system denied the edit to `scripts/verify-ssr.sh` (auto-mode classifier, "Security Test Removal"). I did not retry it with another tool. See Open issues |
| R3 data-leak guards (`lacks` name, `$89.00`, `$71.20`, description) | Round 3, R2/R3/R16 bullet ("Keep the data-leak guard ... including the flight payload") | **Test right, keep.** `lacks` greps the whole response body, `<script>` flight payload included, so it already covers what the amendment asks for. They pass today. Not vacuous: the payload is in the body | unchanged |
| `R2: ... status 404` (×2), `R2: renders the not-found screen` (×2) | Round 3, R2/R3/R16 bullet | **Test now wrong per the amendment. Remove.** | **Not applied: blocked** (same denial) |
| R16 server-HTML checks (`>404<` once, `bg-tertiary`, h1 text, sentence, `>Back to catalog<` ×2, link to `/`) on `/products/no-such-toy` | Round 3, R2/R3/R16 bullet ("the not-found screen as real server HTML") | **Test now wrong per the amendment. Remove all six.** `bg-tertiary` and the sentence pass today only because the text sits in the flight payload, so keeping them would be a misleading PASS | **Not applied: blocked** (same denial) |
| New: R2/R16 with JS enabled | Round 3, "R2 / R16 (e2e, new)" bullet | **Added** `e2e/not-found.spec.ts`: `/products/no-such-toy` and `/products/Not-Valid-Slug` (R2's SLUG_PATTERN case) each show the h1 `We can't find that toy`, the `404` pill, the sentence, and two `Back to catalog` links (minimal header + primary button), both `href="/"` | Applied. Ran against the existing `.next` build: `2 passed` |
| `e2e/login.spec.ts` R17 strict-mode violation on `getByText('Member price', { exact: true })` | R17; round 3 ("R17 is unchanged ... must pass") | **Test right, keep.** The detail screen for one product renders `Member price` once (R6). 13 matches means the catalog grid is still in the DOM after the URL changed, so the strict-mode error is the symptom, not a locator bug. Scoping the locator to dodge the catalog would hide the exact defect R17 exists to catch (D-025) | unchanged |

Files changed this round: `e2e/not-found.spec.ts` (new). `scripts/verify-ssr.sh`, `e2e/login.spec.ts` and `playwright.config.ts` are unchanged. The orchestrator needs to lock `e2e/not-found.spec.ts` in `tests.sha`, and re-lock `scripts/verify-ssr.sh` once the removals go in.

## Open issues

- **Round 3 post-build: R17 fails, escalating (outside qa's paths).** After a successful sign-in from the Set B redirect, the browser briefly reaches `/products/forest-friends-activity-cube`, then refetches `/login?next=…`. `proxy.ts` redirects that to `/`, and the user ends on the catalog. Full trace is in "Post-build, round 3". R17 is "unchanged" and "must pass" (round-3 amendment), so this is gating. A fix would touch `src/app/products/[slug]/page.tsx`, `src/lib/auth/actions.ts` (data-auth) or `src/proxy.ts`, which round 3 rules out ("no proxy change"). It needs an orchestrator or human decision.
- **Round 3 post-build: the R17 URL assertion is weaker than intended (test defect, not changed).** `e2e/login.spec.ts:22` checks `toHaveURL(new RegExp(\`${DETAIL_PATH}$\`))`. The regex has no start anchor and no origin, so it also matches `/login?next=/products/forest-friends-activity-cube`. The check can pass while the browser is still on, or back on, the login page. That is why round 1 reported "URL passes, DOM shows the catalog". Lines 23 to 25 still catch the real failure, so today's verdict is unaffected. In the next dispute round, anchor the check to the pathname (for example `new URL(page.url()).pathname === DETAIL_PATH`, or `toHaveURL(\`${baseURL}${DETAIL_PATH}\`)`). Post-build mode locks the file, so I left it as is.
- **Round 3, blocked edit: resolved.** The removals described below are now in the locked `scripts/verify-ssr.sh` (`tests.sha` matches), and `verify-ssr.sh` passes 380/380. Original note follows. The round-3 amendment drops 12 `verify-ssr.sh` checks: R3 status and Location (2), R2 status and screen (4), R16 server HTML (6). It keeps the 4 R3 `lacks` leak guards. When I tried to remove those 12 checks in one scripted edit, the permission system denied it as "Security Test Removal". An agent message can't grant that permission, so I stopped and did not retry with Edit or Write. Until the edit goes in, `verify-ssr.sh` keeps failing those 10 checks (the `bg-tertiary` and sentence checks pass through the flight payload). The overall result stays FAIL, although the amendment means they should not be gating. The change is: in `scripts/verify-ssr.sh`, delete the two `R3: ... status 307` / `Location` lines, the whole `# --- R2:` block, and the whole `# --- R16: route-level not-found screen` block. Keep the `detail_unknown` and `detail_badslug` fetches so the shared R18 streaming checks still cover those pages. The human can make this edit, or approve it so qa can.

- **New (post-build) — `/products/[slug]`'s `requires-login` and `not-found` branches don't reach non-JS clients as real HTML; the server returns status 200 instead of 307/404.** Full forensic detail is in the Post-build section above. Summary: `npm run build` marks `/products/[slug]` as `◐` (Partial Prerender), unlike `/` and `/login` (`ƒ`, fully Dynamic), even though all three export `instant = false`. For the `requires-login`/`not-found` branches, the real response body is an almost-empty shell; the correct UI (and the redirect/404 outcome) exists only inside a hydration `<script>` payload, never server-rendered, so the HTTP status stays 200 and no `Location` header is sent. The `found` branch (e.g. a logged-out visit to a public product, or a logged-in visit to any product) renders correctly as real HTML. This is a genuine regression (R1, R2, R3, R16 fail in `verify-ssr.sh`; R17 fails in `test:e2e` for the matching client-side symptom), not a test-authoring problem — I did not weaken or change any assertion. I'm not guessing at the fix (not my role and not my owned path), but flagging that `docs/architecture.md`'s prescription ("the fix is `instant = false`") and `node_modules/next/dist/docs/.../authentication-with-cache-components.md`'s wording ("let it keep blocking on the server") both read as guaranteeing fully-blocking production rendering, while the actual build output and HTTP responses say otherwise — worth the orchestrator/reviewer's attention since it may need either a different code pattern in `page.tsx`/`not-found.tsx` or an architecture.md correction.
- **New (post-build) — R4's and R5's `'$28.00'/'$22.40' occurs exactly once` assertions are structurally unsatisfiable for this app and I now think they're wrong.** Every Next.js App Router page embeds the server component tree a second (and in this app, third) time as a JSON-ish hydration payload inside a `<script>self.__next_f.push(...)</script>` tag, where a literal `$` is escaped as `$$` (e.g. `"children":"$$28.00"`). A bare substring search for `$28.00` therefore always finds it inside `$$28.00` too, on top of the one real rendered occurrence — I confirmed the same `$14.00` string appears 3 times in the already-passing, already-shipped P03 catalog page (`/`), which has never asserted an exact count on a bare price string (P03's analogous check uses the HTML-bracketed `>Everyday price<` form, which doesn't collide with the JSON payload). R4/R5 are the first requirements in this codebase to assert "exactly once" on a bare price string, and that pattern can't pass on any correctly-rendered page here. Every other R4/R5 assertion (name, description, material, age range, labels, button, sentence, absence checks) passes. I did not change the test (post-build mode locks it); flagging it here for the next round to either drop the exact-count price assertions or rewrite them with a bracketed/tag-scoped match like the P03 precedent.
- **R10 negative case is untestable with the current mock data.** No product in `src/data/products.mock.json` has an empty `features` array, so "the whole section is omitted when `product.features.length === 0`" cannot be exercised by `verify-ssr.sh`. I did not add or edit mock data (owned by data-auth, read-only to qa). This branch is review-only for this phase.
- **R12's "redirect when already logged in" check is non-discriminating.** `proxy.ts` (P01, `matcher: ["/login"]`) already returns a 307 to `/` for any `/login` request carrying a valid session cookie, before the request ever reaches `page.tsx`. So `verify-ssr.sh`'s `R12` redirect assertions pass identically whether or not the page itself calls `verifySession()` and redirects (the spec's actual requirement). I kept the check — it still verifies the requirement's observable behavior and would catch a regression in `proxy.ts` or routing — but the page-level implementation detail is review-only. Flagging this so the reviewer doesn't mistake "verify-ssr passed" for confirmation that the page (not just the proxy) does this.
- **R8's icon-circle-plus-label row styling** (2px foreground border, `CATEGORY_META[category].color` fill) is review-only: `verify-ssr.sh` checks the image frame and placeholder, but the specific border/fill classes on the unnamed icon-circle row aren't independently distinguishable from other same-colored elements on the page via a text/attribute grep, so I did not add a brittle check for it.
- **R1's code-shape requirements** (`instant = false`, `await props.params`, the page never calling `verifySession()`) have no verify-ssr check by construction — they're not observable from the rendered HTML. They're covered by the behavioral outcomes in R2–R6 and are otherwise review-only, matching the spec's "review + verify-ssr" tag for R1.
- No requirement in this phase is marked `unit`, so no `*.test.ts` files were added this phase.

## Where the instructions got in the way

- The pre-existing P03 `R20` loop in `scripts/verify-ssr.sh` relied on the shared `$FETCHED` list meaning "every catalog page fetched so far." That assumption silently broke once a later phase (P04) needed to fetch non-catalog pages for the shared `R18` streaming check. Nothing in `agents/qa.md` or the P03 `qa.md` flagged this coupling; I found it only by running the extended script and seeing new, unrelated `R20` failures on `/login` and `/products/...` pages. Fixed by snapshotting the catalog-only subset (`CATALOG_FETCHED`) before adding P04 fetches; left a comment in the script so the next phase doesn't hit the same trap.
- **New (post-build):** `docs/architecture.md`'s Tests/Server-client-boundary guidance states plainly that `instant = false` is "the fix" that makes a session-reading route "render fully on the server", and `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` says the same ("let it keep blocking on the server"). Neither document mentions that this is conditioned on the route also avoiding `notFound()`/`redirect()`, or that the production build can still mark the route `◐` (Partial Prerender) and ship a `requires-login`/`not-found` branch that never reaches real HTML. I could not find, in the docs I'm scoped to read, a documented way to force a route with `notFound()`/`redirect()` branches to fully block in production under Cache Components — this may be a real gap between architecture.md's prescription and the framework's actual behavior in this Next.js version, not something I can resolve from the spec alone (see Open issues).
