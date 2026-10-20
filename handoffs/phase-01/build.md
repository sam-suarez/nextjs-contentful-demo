# Phase 01: Build (data-auth, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/session.ts` | created: `SESSION_COOKIE`, `SESSION_TTL_SECONDS`, `Session`, `signSession`, `verifySessionToken`, `createSession`, `deleteSession`. Private helpers `secretKey()` (reads `SESSION_SECRET` on every call, throws if unset/empty/under 32 chars) and `sign()` (returns token and the `expiresAt` derived from the same `exp`, so the cookie `expires` equals the token expiry exactly). HS256, header `{ alg: "HS256" }`, payload `{ name, exp }` only (no `iat`). Verify uses `algorithms: ["HS256"]`, `requiredClaims: ["exp"]`, then requires a non-empty string `name`; every jose error maps to `null` | R1, R2, R3, R4, R5, R6, R18 |
| `src/lib/auth/next-path.ts` | created: `safeNextPath(value: unknown)`. Rejects non-strings, anything not starting with `/`, second char `/` or `\`, any `\`, U+0000–U+001F and U+007F (char-code loop, no control-char regex). No decoding | R7, R18 |
| `src/lib/auth/actions.ts` | created: `login(formData)` and `logout()`, each with `"use server";` as the first body statement; no other exports. zod schema `{ username: z.string().trim().min(1), password: z.string().trim().min(1) }` (null/File fail `z.string()`). `next` is not trimmed. Empty input redirects to `/login?error=missing` or `/login?` + `URLSearchParams({ error, next })`; success calls `createSession(trimmed username)` then `redirect(safeNextPath(next) ?? "/")`. Password is never stored, logged or passed on. `logout` calls `deleteSession()` then `redirect("/")` unconditionally | R8, R9, R10, R11, R12, R13, R18 |
| `src/proxy.ts` | created: `proxy(request)` reads `request.cookies.get("session")?.value`, `verifySessionToken` → `NextResponse.redirect(new URL("/", request.url))` (307) or `NextResponse.next()`. `config = { matcher: ["/login"] }`, no `runtime`, no data fetching | R14, R15, R16 |
| `.env.example` | edited: appended `SESSION_SECRET=` with a comment (server-only, required, at least 32 chars, never `NEXT_PUBLIC_`, `openssl rand -base64 32`). `CONTENTFUL_*` lines unchanged | R17 |

`package.json` and `package-lock.json` unchanged (R19). Test files unchanged: `shasum -a 256 -c handoffs/phase-01/tests.sha` reports OK for all 5.

## Fixes this round

none

## Check output

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `✓ Types generated successfully`; `tsc --noEmit` exit 0 |
| `npm run lint` | PASS | no output, exit 0 |
| `npm test` | PASS | `Test Files 5 passed (5)`, `Tests 109 passed (109)` (103 new + 6 existing schema tests) |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | `✓ Compiled successfully`; routes `/`, `/_not-found`; `ƒ Proxy (Middleware)`. Run with `SESSION_SECRET` unset (not in the shell env or `.env.local`) |
| Runtime proxy smoke test (extra, not in spec) | PASS | `next start` with a scratch `SESSION_SECRET`: `/login` + valid cookie → `307` to `http://localhost:3917/`; no cookie / garbage cookie → pass-through (`404`, since `/login` has no page until P04); `/` + valid cookie → `200` (not matched). Confirms `server-only` and `next/headers` imports in `session.ts` load fine in the Node proxy bundle |

## Open issues

- `verifySessionToken` checks `SESSION_SECRET` before looking at the token, so it throws on a misconfigured server even for `undefined`/`""` (qa.md Open issues notes the spec leaves this open and it is untested). I chose this because architecture.md says "session functions throw if it is missing or too short". The effect: without `SESSION_SECRET`, `/login` returns 500 through the proxy even for logged-out visitors, and P02's `verifySession()` will do the same on `/`. That is fail-loud by design. SSR checks set their own secret (architecture.md Tests).
- `verifySessionToken` also returns `null` for a correctly signed HS256 token with no `exp` (`requiredClaims: ["exp"]`). R3 does not list this case. Sessions must expire (7-day TTL) and `Session.expiresAt` needs a value, so it fits the contract.
- `actions.ts` is not imported by any route yet, so `npm run build` does not compile the function-level `"use server"` directives through Next's server-action transform. Only the unit tests (which see them as plain string statements) exercise the module. The first real compile happens when P03's sign-out form imports `logout`. If Next rejects inline `"use server"` on exported module-level functions in a non-`"use server"` file, that phase will surface it. The docs (`use-server.md`, "Using `use server` inline") say it is supported.
- No disputed tests.

## Where the instructions got in the way

- `agents/data-auth.md` input 6 lists the `use-cache`, `cacheLife` and `cacheTag` docs and `authentication-with-cache-components.md`. This phase uses none of those APIs, so I only skimmed them.
- The Next auth guide's proxy example reads the cookie with `(await cookies())` from `next/headers`. The spec (and the qa trap in `proxy.test.ts`) require `request.cookies`. I followed the spec. The guide's version would fail R14/R15.
