# Phase 01: Auth core

**Builder:** data-auth  ·  **Depends on:** none (base commit `589dd98`)  ·  **Written by:** orchestrator

## Goal

A signed session cookie can be created, verified and deleted on the server; login and logout server actions exist with zod validation and a safe `next` redirect; `src/proxy.ts` optimistically sends logged-in visitors away from `/login`. No pages or components change.

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | `signSession(name)` returns an HS256 JWT that `verifySessionToken` accepts, returning the same `name` and an `expiresAt` 7 days (±60 s) after signing | architecture.md Auth; D-012 | unit |
| R2 | The JWT payload holds exactly two claims: `name` and `exp` (no `iat`, no password, nothing else). Protected header `alg` is `HS256` | architecture.md Auth | unit |
| R3 | `verifySessionToken` returns `null` (never throws) for: `undefined`, `""`, a non-JWT string, a token with any byte of payload or signature changed, a token signed with a different secret, a token whose `exp` is in the past, a token signed with any `alg` other than `HS256` (e.g. HS512 with the same secret), and a token whose payload has no string `name` or an empty `name` | architecture.md Auth; D-012 | unit |
| R4 | `signSession` and `verifySessionToken` throw an `Error` whose message contains `SESSION_SECRET` when `process.env.SESSION_SECRET` is unset, empty, or shorter than 32 characters. Exactly 32 characters is accepted. The variable is read on every call, not once at module load | architecture.md Auth | unit |
| R5 | `createSession(name)` calls `(await cookies()).set("session", <token>, options)` exactly once, where `<token>` verifies to `name` and `options` is `{ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: <Date equal to the token's expiresAt> }` | architecture.md Auth; decisions.md defaults | unit |
| R6 | `deleteSession()` calls `(await cookies()).delete("session")` exactly once | architecture.md Auth | unit |
| R7 | `safeNextPath(value)` returns `value` unchanged when it is a string that starts with `/`, whose second character is neither `/` nor `\`, and that contains no `\` and no ASCII control character (U+0000–U+001F, U+007F); otherwise it returns `null`. Examples: `/products/x` → `/products/x`; `/` → `/`; `/products/x?y=1` → unchanged; `//evil.com`, `/\evil.com`, `https://evil.com`, `evil.com`, `""`, `undefined`, `null`, `42`, `/a\b`, `/a\nb` → `null` | architecture.md Routes; D-018 | unit |
| R8 | `login(formData)` with non-empty trimmed `username` and `password` calls `createSession` with the **trimmed** username, then `redirect(safeNextPath(next) ?? "/")`. With `next=/products/x` it redirects to `/products/x`; with `next=//evil.com`, `next=https://evil.com` or no `next` it redirects to `/` | architecture.md Routes, Auth; D-018 | unit |
| R9 | `login(formData)` where `username` or `password` is missing, not a string, empty or whitespace-only sets no cookie and calls `redirect` with `/login?error=missing` when `next` is not safe, or `/login?` + `new URLSearchParams({ error: "missing", next }).toString()` when it is (e.g. `next=/products/x` → `/login?error=missing&next=%2Fproducts%2Fx`) | architecture.md Routes | unit |
| R10 | The password is never stored, logged or passed on: it does not appear in the cookie value, the JWT payload, the `createSession` argument, or any `console.*` call in the diff | architecture.md Routes | unit + review |
| R11 | Input is validated with a zod schema in `src/lib/auth/actions.ts` (not hand-written `if` checks alone) | architecture.md Auth | review |
| R12 | `logout()` calls `deleteSession()` (cookie `session` deleted) and then `redirect("/")`, whether or not a valid session exists | architecture.md Routes, Auth | unit |
| R13 | `login` and `logout` are server functions: each has `"use server";` as the first statement of its function body (see Contract decisions). `src/lib/auth/actions.ts` exports nothing else | architecture.md Auth; Next docs `use-server.md` ("Using use server inline") | review |
| R14 | `proxy(request)` for a request to `/login` carrying a `session` cookie that `verifySessionToken` accepts returns a 307 redirect whose `Location` is `/` on the request's origin (e.g. `http://localhost:3000/`) | architecture.md Routes (`/login` row), Auth | unit |
| R15 | `proxy(request)` for a request to `/login` with no `session` cookie, or with an invalid/expired/tampered one, returns a pass-through response (`NextResponse.next()`: no `Location` header, status 200, header `x-middleware-next: 1`) | architecture.md Auth | unit |
| R16 | `src/proxy.ts` exports `config` with `matcher: ["/login"]` (a constant literal), sets no `runtime` option, reads the cookie only from `request.cookies`, and performs no data fetching, product lookup or authorization decision beyond the redirect | architecture.md Auth; D-017; Next docs `proxy.md` | unit (matcher) + review |
| R17 | `.env.example` gains `SESSION_SECRET=` (empty value) with a comment saying it is server-only, required, at least 32 characters, never `NEXT_PUBLIC_`, and how to generate one (`openssl rand -base64 32`). The existing `CONTENTFUL_*` lines are unchanged | decisions.md defaults ("SESSION_SECRET ... added to .env.example in P01") | review |
| R18 | Every new file under `src/lib/**`, **including colocated `*.test.ts` files** (amended after review round 1, human decision; Vitest aliases `server-only` to an empty module, so the import is harmless in tests), has `import "server-only";` as its first line, and no `src/lib` module contains a file-level `"use server"` directive | architecture.md Data access; `.claude/rules/server-lib.md`; reviewer G5 | review |
| R19 | No new dependencies; `package.json` and the lockfile are unchanged | agents/data-auth.md Hard rules | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional.

```ts
// src/lib/session.ts
import "server-only";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 604800

export type Session = { name: string; expiresAt: Date };

/** Signs { name } with HS256 and exp = now + SESSION_TTL_SECONDS. Throws if SESSION_SECRET is missing/short. */
export function signSession(name: string): Promise<string>;

/** Returns the session, or null for any missing/invalid/expired/wrong-alg token. Throws only if SESSION_SECRET is missing/short. */
export function verifySessionToken(token: string | undefined): Promise<Session | null>;

/** Signs a token for `name` and sets the `session` cookie (options in R5). */
export function createSession(name: string): Promise<void>;

/** Deletes the `session` cookie. */
export function deleteSession(): Promise<void>;
```

```ts
// src/lib/auth/next-path.ts
import "server-only";

/** Returns `value` if it is a safe same-origin relative path (R7), else null. */
export function safeNextPath(value: unknown): string | null;
```

```ts
// src/lib/auth/actions.ts
import "server-only";

/** Form fields: `username`, `password`, `next` (all optional strings). Always ends in redirect(). */
export async function login(formData: FormData): Promise<void>; // body starts with "use server";

/** Ends in redirect("/"). */
export async function logout(): Promise<void>; // body starts with "use server";
```

```ts
// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest): Promise<NextResponse>;
export const config = { matcher: ["/login"] };
```

- Cookie: name `session`; value is the JWT from `signSession`; options exactly as R5. `cookies()` comes from `next/headers` and is awaited.
- JWT: compact JWS, protected header `{ "alg": "HS256" }`, payload `{ "name": string, "exp": number }`. Signing key: `new TextEncoder().encode(process.env.SESSION_SECRET)`. `verifySessionToken` passes `algorithms: ["HS256"]` to jose `jwtVerify`.
- Redirects: `login` and `logout` call `redirect(url)` from `next/navigation` with a single string argument (qa mocks `next/navigation` and `next/headers`). Targets: success `safeNextPath(next) ?? "/"`; empty input `/login?error=missing` or `/login?error=missing&next=<URLSearchParams-encoded next>`; logout `/`.
- Form fields read by `login`: `formData.get("username")`, `formData.get("password")`, `formData.get("next")`. A non-string value (e.g. a `File`) counts as missing.
- `login` trims `username` and `password` before validating; `next` is **not** trimmed before `safeNextPath`.
- Proxy: reads `request.cookies.get("session")?.value`, verifies it with `verifySessionToken`; valid → `NextResponse.redirect(new URL("/", request.url))` (default status 307); otherwise `NextResponse.next()`.
- Display-name length is not capped (architecture.md: "any non-empty values are accepted").

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- Export names `signSession` / `verifySessionToken` / `createSession` / `deleteSession` / `SESSION_COOKIE` / `SESSION_TTL_SECONDS` / `Session` (names follow the Next auth guide's `createSession`/`deleteSession`; `verifySessionToken` avoids clashing with the DAL's `verifySession()` in P02, which will call it with the cookie value).
- `Session` exposes `expiresAt: Date` (converted from `exp`), not the raw claim, so pages never handle JWT numbers.
- Function-level `"use server"` instead of a file-level directive in `actions.ts`: a file-level directive must be the first statement, which conflicts with architecture.md's "every file in `src/lib/**` starts with `import "server-only";`". Function-level directives are documented (`use-server.md`, "Using `use server` inline") and work because every caller (sign-out form in P03, login page in P04) is a server component. A client component cannot import these actions; none is planned.
- `safeNextPath` lives in its own module (`src/lib/auth/next-path.ts`) so the P04 login page can validate `?next` before rendering it into a hidden input, and so it is not a server function. It is stricter than architecture.md's "starts with `/`, not `//`" by also rejecting backslashes and control characters (browsers treat `/\host` as protocol-relative). This is a subset of what architecture.md allows, so no conflict.
- Unsafe `next` on the empty-input redirect is dropped rather than echoed back.
- `login` does not require or check an existing session: it always issues a fresh session for the submitted name (re-login replaces the cookie). `logout` deletes the cookie unconditionally (signing out needs no authorization). Read as the meaning of "re-check the session themselves" for a demo where any name is accepted: neither action trusts `proxy.ts`.
- Proxy matcher is `/login` only. The only optimistic redirect architecture.md names is "logged-in visitors are redirected to `/`" on `/login`. The Set B slug redirect needs product data, so it stays in the DAL/page (P02/P04), never the proxy.
- Proxy redirects to `/` and ignores `?next` for logged-in visitors (architecture.md `/login` row says `/`).

## Owned paths

| Role | May change |
|------|------------|
| data-auth | `src/lib/session.ts`, `src/lib/auth/actions.ts`, `src/lib/auth/next-path.ts`, `src/proxy.ts`, `.env.example` |
| qa | `src/lib/session.test.ts`, `src/lib/auth/actions.test.ts`, `src/lib/auth/next-path.test.ts`, `src/proxy.test.ts` (the three under `src/lib/**` must start with `import "server-only";`, R18) |

`package.json` changes allowed: none.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
```

Unit tests set `process.env.SESSION_SECRET` themselves (≥ 32 characters) and restore it after; they never rely on `.env.local`. `npm run build` must succeed without `SESSION_SECRET` set (no session function runs at build time in this phase).

## Out of scope

- `src/lib/dal.ts`, `verifySession()`, adapters, `fetchProducts`, filtering (P02).
- Any page, component, header, sign-out form or login form (`src/app/**`, `src/components/**`; P03/P04).
- `scripts/verify-ssr.sh`, Playwright (P03/P04).
- Rate limiting, CSRF tokens beyond Next's built-in server-action origin check, password checks, user storage, display-name length limits.
- Proxy redirects for `/products/[slug]` or any route other than `/login`.

## Where the instructions got in the way

- architecture.md ("every file in `src/lib/**` starts with `import \"server-only\";`") and the conventional file-level `"use server"` directive cannot both hold in `actions.ts`, since a directive must come first. Resolved with function-level directives (Contract decisions); worth stating in architecture.md.
- architecture.md says the actions "re-check the session themselves" but does not say what that means when any name is accepted. Interpreted in Contract decisions.
- R18 as first written ("every new file under `src/lib/**`") did not say whether colocated tests count; the reviewer read it literally and returned REVISE on qa-owned files the builder cannot touch. The human chose to cover tests too; R18 was amended after round 1. architecture.md Data access and reviewer G5 should say this explicitly.
- The continuation prompt was pasted rather than run through `/phase`, so the orchestrator path-guard hook (D-029) was not active this thread. The orchestrator kept to its Paths table by hand.
