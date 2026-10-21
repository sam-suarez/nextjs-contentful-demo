# Phase 04-fix2: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `R1: route.ts exports exactly one binding, POST`; `R1: POST is a function` | `src/app/logout/route.test.ts` |
| R2 | (amended, see Dispute) `R2: with %s, calls deleteSession() exactly once` and `R2: with %s, answers 303 with Location exactly /`, each for: no Origin (Host `localhost:3000`); Host `127.0.0.1:3220` + Origin `http://127.0.0.1:3220`; X-Forwarded-Host `shop.example.com, proxy.internal` + Host `localhost:3000` + Origin `https://shop.example.com`. `R2: the 303 is returned only after deleteSession() has settled` (contract: `await deleteSession(); return ...`) | `src/app/logout/route.test.ts` |
| R3 | (amended, see Dispute) `R3: with %s, answers 403 with no Location header` and `R3: with %s, does not call deleteSession()`, each for Host `localhost:3000` + Origin `https://evil.example`, `null`, `http://localhost:3001`, `http://127.0.0.1:3000`, `http://localhost:3000.evil.example`; and Host `shop.example.com` + Origin `http://localhost:3000` (equal to `request.url`'s origin only) | `src/app/logout/route.test.ts` |
| R4 | `R4: with a session cookie and no Origin / a same Origin, answers 303 to / and calls deleteSession() once`; `R4: with a session cookie and a foreign Origin, answers 403 ...`; `R4: without a session cookie, resolves (never throws)`; `R4: does no session read (never calls cookies() or headers() from next/headers)` | `src/app/logout/route.test.ts` |
| R4 | `P04-fix2 R4: POST /logout without a session status 303` / `Location is exactly /` (with and without `Origin: $BASE`); `P04-fix2 R4/R6: POST /logout without a session, Origin https://evil.example, status 403` | `scripts/verify-ssr.sh` |
| R5 | `P04-fix2 R5: POST /logout with a session status 303` / `Location is exactly /` / `clears the session cookie (empty value, Max-Age=0 or past Expires)`; the same three with `Origin: $BASE` (the browser's own form POST) | `scripts/verify-ssr.sh` |
| R6 | `P04-fix2 R6: POST /logout with Origin https://evil.example status 403` / `sends no Set-Cookie for session` / `has no Location header` | `scripts/verify-ssr.sh` |
| R7 | `P04-fix2 R7: GET /logout status 405`; `GET /logout with a session status 405`; `GET /logout with a session sends no Set-Cookie for session` | `scripts/verify-ssr.sh` |
| R8 | `P04-fix2 R8: / with a session has exactly one <form action="/logout">, method="post", one <button type="submit">Sign out</button>, no $ACTION_ID_ inside`; `... contains action="/logout"`; `... has a <form> with action=/logout and method=post`; `/ without a session has no <form action="/logout">` | `scripts/verify-ssr.sh` |
| R10 | `R10 (04-fix2): actions.ts exports only login` (replaces P04 `R13: exports only login and logout`; the two P04 R12 `logout` tests and the `logout` / `signSession` imports are removed). `login` unchanged: the existing P04 R8-R10 login tests are kept as they were | `src/lib/auth/actions.test.ts` |
| R11 | `R11 (04-fix2), R12 (04-fix1), P04 R17: login from a members-only redirect reveals Set B pricing; sign-out is a full page load that leaves no Set B in the DOM`: waits for a `POST` navigation request of type `document` to `/logout`; pathname `/`; a `window` marker set before the click is gone (new document); `Sign in` link visible; whole-DOM `getByText` counts 0 (no visibility filter) for "Forest Friends Activity Cube", "Signed in as", "Member price" (exact), "$71.20" (exact), plus no Sign out button incl. hidden; `page.content()` lacks the Set B name and "Signed in as"; no `session` cookie. No reload anywhere | `e2e/login.spec.ts` |
| R12 | The full Checks list (post-build), plus reading the `next build` route table (`/`, `/login`, `/products/[slug]` `◐`; `/logout` `ƒ`) | all |

Requirements verified only by `review`: R9 (spec grep command; run post-build too).

**Run summary:**

- `npm run typecheck` (tsc): 2 errors, both TS2307 `Cannot find module './route'` in `src/app/logout/route.test.ts`. No other errors.
- `npx eslint` on the three changed test files: clean. `bash -n scripts/verify-ssr.sh`: OK.
- `npm test`: 16 files, 388 tests: 387 passed, 1 failed; 2 files failed (`route.test.ts` cannot load `./route`; `actions.test.ts` 1 failure).
- `scripts/verify-ssr.sh` (with `route.test.ts` moved aside for that one build, then put back): 478 passed, 17 failed. All 17 are the new P04-fix2 checks; every pre-existing check passes.
- `npx playwright test e2e/login.spec.ts` (same build): 1 failed.

```
FAIL src/app/logout/route.test.ts  Error: Failed to resolve import "./route" (route.test.ts:21)
FAIL actions.test.ts > R10 (04-fix2): actions.ts exports only login
  AssertionError: expected [ 'login', 'logout' ] to deeply equal [ 'login' ]
FAIL: P04-fix2 R5: POST /logout with a session status 303            (got 404)
FAIL: P04-fix2 R6: POST /logout with Origin https://evil.example status 403   (got 404)
FAIL: P04-fix2 R7: GET /logout status 405                            (got 404)
FAIL: P04-fix2 R8: / with a session has exactly one <form action="/logout">, method="post", ...
  (today: <form class="shrink-0" action="" encType="multipart/form-data" method="POST">)
verify-ssr: 478 passed, 17 failed
e2e login.spec.ts:50  TimeoutError: page.waitForRequest: Timeout 10000ms exceeded
  (no POST document request to /logout: Sign out is still a server-action fetch)
```

Test-validity check (not a repo change): `route.test.ts` copied into the scratchpad next to a reference `route.ts` written from the spec contract: 24/24 pass. With `await deleteSession()` changed to `void deleteSession()` and a `GET` export added, exactly the R1 export test and the R2 "settled" test fail. The verify-ssr Set-Cookie and form helpers were also checked on hand-made input (cleared via `Expires` 1970 and via `Max-Age=0` pass; a non-empty value fails; a `method="POST"` form with `$ACTION_ID_` fails).

**Why each failure is the expected one:**

- `route.test.ts`: `src/app/logout/route.ts` does not exist yet (step A).
- `actions.test.ts` R10: `logout` is still exported. It is removed in step B (data-auth). As the spec says, this one stays red after step A until step B.
- verify-ssr R4-R7: `/logout` has no route yet, so every request gets 404. R8: the header still renders the server-action form (`action=""`, `method="POST"`, `$ACTION_ID_`), not `action="/logout" method="post"`. The checks that only assert absence (no Set-Cookie on 403/GET, no Location on 403, no `/logout` form logged out) pass trivially before the build. That is expected, and the status checks next to them fail.
- e2e R11: Sign out is still a server action (a fetch to the current URL), so no `POST` document request to `/logout` ever happens.

## Post-build

Output only for a FAIL, at most 15 lines per check.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS (16 files, 414 tests) | |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS (`/`, `/login`, `/products/[slug]` `◐`; `/logout` `ƒ`) | |
| `scripts/verify-ssr.sh` | PASS (495 passed, 0 failed) | |
| `npm run test:e2e` | PASS (25 passed) | |
| R9 grep | PASS (no output) | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (unit) |
| R2 | PASS (unit) |
| R3 | PASS (unit) |
| R4 | PASS (unit + verify-ssr) |
| R5 | PASS (verify-ssr) |
| R6 | PASS (verify-ssr) |
| R7 | PASS (verify-ssr) |
| R8 | PASS (verify-ssr; review pending) |
| R9 | PASS (grep empty) |
| R10 | PASS (unit; unused-import part left to lint, clean) |
| R11 | PASS (e2e) |
| R12 | PASS (all checks, route table read) |

**Overall:** PASS

## Dispute

Mode: dispute, from the spec's pre-build amendment (OI-A). The amendment names the R2/R3 unit tests: they set the `host` header explicitly, and `x-forwarded-host` for one case. Only `src/app/logout/route.test.ts` changed. `verify-ssr.sh` and `e2e/login.spec.ts` are unchanged ("no change in intent"). curl and Chromium send `Host` equal to the `Origin` host (`127.0.0.1:3210` / `127.0.0.1:3220`), so the existing same-origin checks already encode the amended rule.

| Test | File | Decision | Reason |
|------|------|----------|--------|
| `R2: with %s, calls deleteSession() exactly once` / `... answers 303 with Location exactly /` (one shared case table) | `src/app/logout/route.test.ts` | changed | Amendment: the app host is `x-forwarded-host` (first value, trimmed) ?? `host` ?? the `request.url` host. "No Origin" now sets Host `localhost:3000`. The old case "Origin equal to the request URL's origin" (no Host) is replaced by Host `127.0.0.1:3220` + Origin `http://127.0.0.1:3220`, which is the browser case OI-A found. Its host differs from `request.url`'s, so a `request.url`-based handler fails it. The one `x-forwarded-host` case is `shop.example.com, proxy.internal` + Host `localhost:3000` + Origin `https://shop.example.com`. It is 303 only if the first forwarded value takes precedence over `host`. |
| `R3: with %s, answers 403 with no Location header` / `... does not call deleteSession()` (one shared case table) | `src/app/logout/route.test.ts` | changed | Every case now sends Host `localhost:3000`. Removed `https://localhost:3000`: the amended rule compares hosts, not origins, and its host `localhost:3000` equals the app host, so it is no longer foreign. Asserting 403 there would contradict the contract. Added Host `shop.example.com` + Origin `http://localhost:3000`, the R3 mirror of the R2 case: the Origin matches only `request.url`, not the app host, so it must get 403. `null` stays in the table (unparseable, so foreign). |
| R1, R2 "settled", all R4 tests | `src/app/logout/route.test.ts` | kept | Not named by the amendment. The R4 same-Origin test (Origin `http://localhost:3000`, no Host) still matches the contract through the `request.url` fallback. |

Validation (scratchpad only, no repo change): the amended test file was run against two reference handlers. One follows the amended contract: 26/26 pass. One follows the original `request.url`-origin contract: exactly 6 fail (both R2 tests for the `127.0.0.1` and `x-forwarded-host` cases, and both R3 tests for the `shop.example.com` case). In the repo, `tsc` gives only the 2 expected TS2307 errors (`./route` missing), `route.test.ts` still fails with "Cannot find module ./route", and eslint is clean on the file.

## Open issues

**OI-A (resolved by the spec's pre-build amendment; tests updated in Dispute above). Original text:** (blocking, escalation: the spec contract and architecture.md disagree in practice). With the contract's origin check, the real browser sign-out gets 403, so R11 (e2e) cannot pass.

The contract defines the app's origin as `new URL(request.url).origin`. Under `next start`, Next builds `request.url` from its own listen config, not from the `Host` header: `node_modules/next/dist/server/lib/router-utils/resolve-routes.js:118` sets `initURL = \`${protocol}://${opts.hostname || 'localhost'}:${opts.port}${req.url}\`` (unless `experimental.trustHostHeader`). I confirmed this with a throwaway Next 16.4.2 app in the scratchpad (POST route echoing `request.url`, `next start --port 3297`):

```
curl -X POST -H "Origin: http://127.0.0.1:3297" http://127.0.0.1:3297/echo
{"url":"http://localhost:3297/echo","origin":"http://127.0.0.1:3297"}
curl -X POST -H "Host: shop.example.com" http://127.0.0.1:3297/echo
{"url":"http://localhost:3297/echo","origin":null}
```

Consequences for a builder who follows the contract exactly:

- e2e: Playwright's `baseURL` is `http://127.0.0.1:3220`, so Chromium's sign-out form POST carries `Origin: http://127.0.0.1:3220`. The handler compares it with `http://localhost:3220` and answers 403. R11 fails (no navigation to `/`, session kept).
- verify-ssr: the two same-origin checks (`Origin: $BASE` = `http://127.0.0.1:3210`, under R4 and R5) fail for the same reason. I added them on purpose. They encode R2 as the browser sees it and architecture.md Routes ("differs from the **app's** origin"). The contract's unit-level reading (`request.url`) disagrees with that whenever the host isn't literally `localhost`.
- Production: the same applies to any deployment where the server's `request.url` host differs from the public host (any domain behind `next start`). Every real sign-out would be refused.

A possible fix (spec decision, not mine): compare the `Origin`'s host with the request's `x-forwarded-host` ?? `host` header. That is how Next's own Server Actions CSRF check does it. Another option is `experimental.trustHostHeader`, if that is acceptable. Either way the contract and probably R2/R3 wording need an amendment. The unit tests build `new Request("http://localhost:3000/logout")`, which carries no `Host` header in Node, so a host-header-based check would also need the R2 same-origin unit cases changed (dispute mode, named by the amendment). Changing the Playwright `baseURL` to `localhost` alone would hide the production defect, and `playwright.config.ts` is not in this phase's owned paths.

I wrote every test from the spec as it stands and did not guess the fix.

Other notes (non-blocking):

- R4 "no session read": the unit test enforces it by mocking `next/headers` (`cookies()`/`headers()` record the call and throw) and by mocking `@/lib/session` with `deleteSession` only (the contract's only dependency). If the handler imports anything else from `@/lib/session`, Vitest reports "no export defined on the mock". That is intended.
- R10 "any import `logout` alone used is removed": not unit-testable through exports. It is left to review and `npm run lint` (unused import).

## Where the instructions got in the way

- R12 ("`/logout` listed as `ƒ`", page routes `◐`) has no automated check. It is read from the `next build` output post-build.
- The spec contract fixes the origin computation (`new URL(request.url).origin`), but the framework notes don't say how Next derives `request.url` under `next start`. Finding that took a framework-source read and a throwaway build. Worth a line in `docs/next-16-notes.md` once the spec is amended.
