# Phase 04-fix2: Sign-out full page load (OI-2, D-034)

**Builder:** ui (step A), then data-auth (step B), in sequence in one phase (human override for this thread, D-034)  ·  **Depends on:** 6d142c0 (D-034 docs), b6b3a9d (phase 07), 5f15cd8 (04-fix1)  ·  **Written by:** orchestrator

**Read:** architecture.md Routes, Directory layout, Data access (first two bullets), Auth, Tests; design.md Page shell (the `session` header variant). Builder and reviewer read only these (D-033).

## Goal

Sign out is a plain HTML form that posts to a new `POST /logout` route handler. The handler deletes the session cookie and answers 303 to `/`, so the browser does a full page load and no hidden copy of the previous members-only page stays in the tab's DOM (OI-2). The `logout` server action is removed.

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `src/app/logout/route.ts` exists and exports exactly one binding, `POST` (no `GET`, no other method, no `dynamic`/`revalidate`/`runtime` config exports) | architecture.md Routes; D-034 | unit + review |
| R2 | `POST` with no `Origin` header, or with an `Origin` whose host equals the app host (see Contract, amended), calls `deleteSession()` from `@/lib/session` exactly once and returns status 303 with header `Location` exactly `/` | architecture.md Routes, Auth; D-034 | unit |
| R3 | `POST` with an `Origin` header that is present and whose host differs from the app host, or that is not a parseable URL (including the literal `null`), returns status 403, does not call `deleteSession()`, and has no `Location` header | architecture.md Routes; D-034 | unit |
| R4 | `POST` answers the same way with or without a session cookie (no session read; it never throws without one) | architecture.md Routes ("Any") | unit + verify-ssr |
| R5 | HTTP: `curl -X POST` `/logout` with the minted session cookie answers `303`, `location: /`, and a `Set-Cookie` for `session` that clears it (empty value with `Max-Age=0` or an `Expires` in the past) | architecture.md Tests; D-034 | verify-ssr |
| R6 | HTTP: `curl -X POST` `/logout` with `Origin: https://evil.example` answers `403` and sends no `Set-Cookie` for `session` | architecture.md Tests; D-034 | verify-ssr |
| R7 | HTTP: `GET /logout` answers `405` | architecture.md Routes | verify-ssr |
| R8 | The `session` header variant's sign-out control is `<form method="post" action="/logout">` containing a `<button type="submit">` with the text "Sign out" (unchanged classes and position). Rendered HTML of `/` with a session contains `action="/logout"` and `method="post"` on that form | design.md Page shell; D-034 | verify-ssr + review |
| R9 | No file under `src/` imports `logout` from `@/lib/auth/actions` | D-034 | review (command below) |
| R10 | (step B, data-auth) `src/lib/auth/actions.ts` exports only `login`; the `logout` function and any import it alone used (e.g. `deleteSession`) are removed. `login` behaviour is unchanged | architecture.md Auth; D-034 | unit |
| R11 | e2e: sign in from the members-only redirect as today, then click "Sign out". A `POST` document (navigation) request to `/logout` happens, the page ends on pathname `/`, and **with no reload** the whole DOM (not only visible elements) has 0 matches for "Forest Friends Activity Cube", "Signed in as", "Member price" (exact) and "$71.20" (exact); "Sign in" link is visible; no `session` cookie remains | OI-2; D-034 | e2e |
| R12 | Every existing check still passes: typecheck, lint, unit, client boundary, build (all three page routes still `◐`; `/logout` listed as `ƒ`), verify-ssr, full e2e incl. `e2e/layout-shift.spec.ts` | architecture.md Tests | all |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

```ts
// src/app/logout/route.ts  (ui, step A)
export async function POST(request: Request): Promise<Response>
// Origin check (amended before build, see Amendments):
//   appHost = first comma-separated value of `x-forwarded-host`, trimmed, if present;
//             else the `host` header; else new URL(request.url).host
//   origin  = request.headers.get("origin")
//   origin !== null && (origin is not a parseable URL || new URL(origin).host !== appHost)
//       -> new Response(null, { status: 403 })
// otherwise: await deleteSession(); return new Response(null, { status: 303, headers: { Location: "/" } })
```

```ts
// src/lib/session.ts  (unchanged, P01)
export async function deleteSession(): Promise<void>
```

```ts
// src/lib/auth/actions.ts  (data-auth, step B)
export async function login(formData: FormData): Promise<void>   // only export; logout removed
```

```tsx
// src/components/site-header.tsx  (ui, step A): logged-in session controls
<form method="post" action="/logout" className="shrink-0">
  <button type="submit" className={BUTTON_SECONDARY}>Sign out</button>
</form>
```

- `Location` is the relative path `/` exactly (not an absolute URL).
- The cookie name is `session` (`SESSION_COOKIE`).
- Unit tests call `POST(new Request("http://localhost:3000/logout", { method: "POST", headers }))` with `@/lib/session`'s `deleteSession` mocked (`vi.mock`); no Next request context is needed.
- verify-ssr uses its existing server, port and minted `ssr-checker` cookie; foreign origin `https://evil.example`.
- Expected data qa asserts on (unchanged mock data): Set B product `forest-friends-activity-cube`, name "Forest Friends Activity Cube", member price `$71.20`.

### Contract decisions

- `Location: /` relative, via a plain `Response`, so the redirect never names an internal host behind a proxy (`NextResponse.redirect` needs an absolute URL).
- The app host is `x-forwarded-host` (first value) ?? `host` ?? `new URL(request.url).host`, compared with the `Origin` header's host, the same rule Next's Server Actions CSRF check uses. No new env var. `Origin: null` and unparseable values count as foreign. (Amended: `request.url` is always `http://localhost:<port>` under `next start`, so it can't stand for the app's origin.)
- Build order inside the phase: ui first (route + form, so nothing imports `logout`), then data-auth removes the action. Until step B, `src/lib/auth/actions.test.ts` (qa's R10 assertions) is expected to fail; ui records that in `build.md` "Open issues" as expected, not as a dispute, and its stop gate may block once on it.
- `/logout` is not added to the proxy matcher (no redirect is needed there).

## Owned paths

| Role | May change |
|------|------------|
| ui (step A) | `src/app/logout/route.ts` (new), `src/components/site-header.tsx` |
| data-auth (step B) | `src/lib/auth/actions.ts` |
| qa | `src/app/logout/route.test.ts` (new), `src/lib/auth/actions.test.ts`, `scripts/verify-ssr.sh`, `e2e/login.spec.ts` |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build; echo "exit=$?"
scripts/verify-ssr.sh
npm run test:e2e
grep -rn "logout" src --include='*.ts' --include='*.tsx' | grep "@/lib/auth/actions"   # R9: expect no output
```

## Out of scope

- Changes to `login`, `src/proxy.ts`, the DAL, `src/lib/session.ts`, skeletons or any layout/size constant.
- A client island, `router.refresh()`, `window.location` or any JavaScript for sign-out.
- A `/logout` page, GET handling, or a "signed out" message.

## Amendments

**Pre-build amendment (orchestrator, after qa pre-build OI-A).** The original contract took the app's origin from `new URL(request.url).origin`. qa showed (`resolve-routes.js:118`, a throwaway Next 16.4.2 app) that under `next start` `request.url` is built from the listen config (`http://localhost:<port>`), not the `Host` header, so the browser's own sign-out from `127.0.0.1` or a real domain would get 403 and R11 could not pass. The contract now compares the `Origin` host with the app host (`x-forwarded-host` ?? `host` ?? `request.url` host). Unit tests for R2/R3 set the `host` (and, for one case, `x-forwarded-host`) header explicitly; verify-ssr and e2e need no change in intent.

## Where the instructions got in the way

- The fix needs two builders; the procedure allows one per phase. The human overrode it for this thread (intervention log, 2026-10-21).
- The orchestrator wrote `request.url` as the app origin without a Next source check; qa caught it pre-build. "The app's origin" in architecture.md is not one value under `next start`.
