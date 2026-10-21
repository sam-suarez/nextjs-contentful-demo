# Phase 04-fix2: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/app/logout/route.ts:34-36 (diff 456): `POST` is the only `export`; `appHost`/`isForeignOrigin` are not exported; no `GET`, no config exports. route.test.ts:80-82 (diff 325-327) asserts `Object.keys(module)` is `["POST"]`. | |
| R2 | PASS | route.ts:14-23,34-36: no `Origin` → `isForeignOrigin` false; with `Origin`, its host is compared to `x-forwarded-host` (first value, trimmed) ?? `host` ?? `request.url` host; on match `await deleteSession()` then `new Response(null,{status:303,headers:{Location:"/"}})`. Unit cases: no Origin, Host ≠ request.url host, x-forwarded-host (diff 282-296, 333-364). | |
| R3 | PASS | route.ts:15-22: present Origin that fails to parse (`new URL("null")` throws → catch returns true) or host mismatch → 403, no body, no `Location`, before `deleteSession`. Unit cases cover evil.example, `null`, other port, other host, suffix attack, Host matching only request.url (diff 297-312, 366-381). | |
| R4 | PASS | route.ts reads only `request.headers`; no session read, no `cookies()` call except inside `deleteSession` (delete only). Unit tests (diff 383-419) assert same answer with/without cookie, never throws, no `next/headers` calls; verify-ssr anonymous POST with/without same Origin (diff 210-215). | |
| R5 | PASS | scripts/verify-ssr.sh (diff 200-208) POST with `$GOOD_COOKIE` → 303, `Location` exactly `/`, session cleared; `set-cookie.mjs` (diff 118-140) requires ≥1 `session` Set-Cookie, each with empty value and `Max-Age<=0` or past `Expires`. src/lib/session.ts:71-74 `deleteSession` calls `cookieStore.delete("session")`. | |
| R6 | PASS | verify-ssr (diff 217-222): Origin `https://evil.example` → 403, no `session` Set-Cookie (`no_session_set_cookie`), no `Location`. | |
| R7 | PASS | Only `POST` exported (route.ts:34); verify-ssr (diff 224-228) asserts `GET /logout` → 405 with and without a session. | |
| R8 | PASS | src/components/site-header.tsx:64-68: `<form method="post" action="/logout" className="shrink-0">` with `<button type="submit" className={BUTTON_SECONDARY}>Sign out</button>`, same position in `SessionControls`. verify-ssr (diff 230-235) checks attributes, one submit button "Sign out", no `$ACTION_ID_` inside the form, and absence when logged out. | |
| R9 | PASS | Grep of "logout" under src shows no import from `@/lib/auth/actions`; import removed from site-header.tsx (diff 471); actions.test.ts imports only `login` (diff 494). | |
| R10 | PASS | src/lib/auth/actions.ts:17 `login` is the only export; `logout` and the `deleteSession` import are gone (diff 546-562); `login` body unchanged; `redirect` still used by `login`. actions.test.ts (diff 534-535) asserts exports `["login"]`. | |
| R11 | PASS | e2e/login.spec.ts (diff 31-82): waits for a POST navigation request (resource type `document`) to `/logout`; asserts pathname `/` with no reload; a window marker is gone (proves a full page load); "Sign in" link visible; `getByText` (includes hidden) counts 0 for "Forest Friends Activity Cube", "Signed in as", "Member price" (exact), "$71.20" (exact); also checks `page.content()` HTML; no `session` cookie remains. | |
| R12 | PASS | Nothing in the diff is likely to break existing checks: no unused imports left (actions.test.ts still uses `deleteSession` at line 73; `signSession` import removed with its tests); no skeleton/layout/proxy file touched. Command results are qa's run. | |
| G1 | PASS | Touched: route.ts, site-header.tsx (ui); actions.ts (data-auth); route.test.ts, actions.test.ts, verify-ssr.sh, login.spec.ts (qa). All owned paths; package.json unchanged. | |
| G2 | PASS | No `'use client'` added anywhere in the diff. | |
| G3 | PASS | No `instant = false`, no `loading.tsx`; the form stays inside the existing `SessionControls` (site-header.tsx:40-71) unchanged except for the form tag; route handler renders no UI. | |
| G4 | PASS | No `NEXT_PUBLIC_`, no secrets; handler logs nothing and puts nothing into the session payload. | |
| G5 | PASS | No new file under src/lib; existing actions.ts still starts with `import "server-only";` (line 1). | |
| G6 | PASS | No client island added or changed; sign-out uses no JavaScript. | |

Overall: PASS

Notes:
- Origin check compares host only, not scheme+host. This follows the amended Contract and Next's Server Actions CSRF rule, but architecture.md Routes says "differs from the app's origin"; architecture.md may want a one-line wording update.
- Host comparison is an exact string match: `new URL(origin).host` lowercases and drops default ports (`:443`/`:80`), but the raw `Host` / `x-forwarded-host` header is not normalised. A client sending `Host: Example.com` or `Host: shop.example.com:443` with a matching Origin would get 403. Safe failure direction and outside every spec case, so noted, not REVISE.
- e2e: the `waitForLoadState("load")` after `toHaveURL` is redundant with the window-marker check; harmless.

Where the instructions got in the way: The task message gave only spec/diff paths; resolved relative to the repo root.

**Orchestrator decision:** close (qa-run post-build PASS: unit 414, verify-ssr 495/495, e2e 25/25, build `◐` ×3 + `/logout` `ƒ`)
