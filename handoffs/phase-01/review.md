# Phase 01: Review

Reviewer inputs: `spec.md` + `diff.patch` only. Each round below is the reviewer's output copied verbatim by the orchestrator.

## Round 1

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/session.ts:25-32 (exp = now + SESSION_TTL_SECONDS, HS256 sign, expiresAt = exp*1000); src/lib/session.ts:45-51 (verify returns `{ name, expiresAt: new Date(exp*1000) }`) | |
| R2 | PASS | src/lib/session.ts:28-31 (`new SignJWT({ name })`, `setProtectedHeader({ alg: "HS256" })`, `setExpirationTime(exp)`, no `setIssuedAt` or other claims); password never reaches `sign` (src/lib/auth/actions.ts:35) | |
| R3 | PASS | src/lib/session.ts:43 (`undefined`/`""` → null); :45-48 (`jwtVerify` with `algorithms: ["HS256"]`, `requiredClaims: ["exp"]`, which rejects tampered, wrong-secret, expired and non-HS256 tokens); :50 (non-string or empty `name` → null); :52-54 (any verify error → null, never thrown) | |
| R4 | PASS | src/lib/session.ts:14-22 (`process.env.SESSION_SECRET` read inside `secretKey()` on every call; `!secret \|\| secret.length < 32` throws an `Error` whose message contains `SESSION_SECRET`; exactly 32 is accepted); called outside the try at :26 (sign) and :42 (verify), so it rejects instead of returning null | |
| R5 | PASS | src/lib/session.ts:58-67 (one `(await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt })`; `expiresAt` comes from the same `exp` that is signed into the token, :32) | |
| R6 | PASS | src/lib/session.ts:71-73 (one `(await cookies()).delete(SESSION_COOKIE)`) | |
| R7 | PASS | src/lib/auth/next-path.ts:5 (must be a string starting with `/`); :7 (2nd char `/` or `\` → null); :8-12 (any `\`, U+0000–U+001F or U+007F → null); :13 (returns `value` unchanged); `/` passes because `value[1]` is undefined | |
| R8 | PASS | src/lib/auth/actions.ts:20 (`next` not trimmed before `safeNextPath`); :11-14 (zod `.trim().min(1)`); :35 (`createSession(parsed.data.username)`, the trimmed value); :36 (`redirect(next ?? "/")`, called after `createSession`) | |
| R9 | PASS | src/lib/auth/actions.ts:21-24 (raw `formData.get` values go to zod, so `null` and `File` fail `z.string()`; whitespace-only fails `.trim().min(1)`); :26-32 (redirects to `/login?error=missing` or `"/login?" + new URLSearchParams({ error: "missing", next })`, before `createSession`) | |
| R10 | PASS | src/lib/auth/actions.ts:35 (only the username is passed on); no `console.*` call anywhere in the diff; `parsed.error` is never logged; the JWT payload is `{ name }` + exp only (src/lib/session.ts:28) | |
| R11 | PASS | src/lib/auth/actions.ts:4, :11-14 (`loginSchema = z.object({...})`, used through `safeParse` at :21) | |
| R12 | PASS | src/lib/auth/actions.ts:40-44 (`await deleteSession(); redirect("/");`, no session check) | |
| R13 | PASS | src/lib/auth/actions.ts:18 and :42 (`"use server";` is the first statement of the `login` and `logout` bodies); the only exports are `login` (:17) and `logout` (:40); `loginSchema` (:11) is not exported | |
| R14 | PASS | src/proxy.ts:10-12 (`verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)`; a valid session returns `NextResponse.redirect(new URL("/", request.url))`, default 307 on the request origin) | |
| R15 | PASS | src/proxy.ts:14 (`NextResponse.next()` when verify returns null: no cookie, or an invalid, expired or tampered one) | |
| R16 | PASS | src/proxy.ts:17 (`export const config = { matcher: ["/login"] };`, a literal with no `runtime`); :10 (cookie read only from `request.cookies`); :9-15 (no fetching or product lookup) | |
| R17 | PASS | .env.example:6-9 (comment says server-only, required, never `NEXT_PUBLIC_`, at least 32 characters, `openssl rand -base64 32`; then `SESSION_SECRET=` with an empty value); .env.example:1-4 are unchanged context lines | |
| R18 | REVISE | Compliant: src/lib/session.ts:1, src/lib/auth/actions.ts:1, src/lib/auth/next-path.ts:1 start with `import "server-only";`, and there is no file-level `"use server"` in `src/lib`. Violation: new files src/lib/session.test.ts:1 (`import { SignJWT, ... } from "jose";`), src/lib/auth/actions.test.ts:1 (`import { decodeJwt } from "jose";`) and src/lib/auth/next-path.test.ts:1 (`import { describe, expect, it } from "vitest";`) are also "new files under src/lib/**" and do not start with it | Either every new file under `src/lib/**`, including the three colocated test files (qa-owned), has `import "server-only";` as line 1 (harmless: architecture.md Tests says `server-only` is aliased to an empty module in Vitest), or the orchestrator/human amends R18 and G5 to exclude `*.test.ts` |
| R19 | PASS | The diff touches only .env.example, src/lib/session{,.test}.ts, src/lib/auth/{actions,next-path}{,.test}.ts and src/proxy{,.test}.ts. No `package.json` or lockfile hunk. `jose` and `zod` are imported, and architecture.md Stack already lists both | |
| G1 | PASS | Every changed file is a data-auth path (src/lib/session.ts, src/lib/auth/actions.ts, src/lib/auth/next-path.ts, src/proxy.ts, .env.example) or a qa test path (the four `*.test.ts` files) | |
| G2 | PASS | No `'use client'` anywhere in the diff; the only directives are `"use server"` at src/lib/auth/actions.ts:18 and :42 | |
| G3 | PASS | No `src/app/**` or `src/components/**` changes; no `<Suspense>` or `loading.tsx` in the diff | |
| G4 | PASS | `SESSION_SECRET` is read only server-side (src/lib/session.ts:15); no `NEXT_PUBLIC_` read; the error message (src/lib/session.ts:17-19) does not include the secret value; the session payload is name + exp only (:28-31); .env.example:6 says never `NEXT_PUBLIC_` | |
| G5 | REVISE | Same evidence as R18: the three non-test modules comply (src/lib/session.ts:1, src/lib/auth/actions.ts:1, src/lib/auth/next-path.ts:1); the new test files src/lib/session.test.ts:1, src/lib/auth/actions.test.ts:1 and src/lib/auth/next-path.test.ts:1 do not | Same as R18 |
| G6 | PASS | The diff adds no client island; nothing under `src/components/client/` | |

Overall: REVISE

Notes:
- When `SESSION_SECRET` is unset, `verifySessionToken` throws (as R4 requires). `src/proxy.ts:10` does not catch it, so every `/login` request will error in the proxy instead of rendering the page. This matches the spec's fail-loud intent, but it is worth knowing for local dev and for P04's SSR checks, which must set their own `SESSION_SECRET` (architecture.md Tests already says so).
- `src/proxy.ts:3` brings `src/lib/session.ts` into the proxy bundle, along with its `server-only` and `next/headers` imports. Nothing in the diff shows whether that bundles cleanly for the proxy. qa's `npm run build` check settles it.
- `src/lib/auth/next-path.ts:7` checks for a backslash as the 2nd character, which the loop at :8-12 already rejects. It is redundant but harmless and keeps the intent readable.
- `src/lib/session.ts:47` adds `requiredClaims: ["exp"]`, which is stricter than R3 asks (a token with no `exp` is rejected). It is consistent with the spec.
- The test files each have one `describe`, as `.claude/rules/tests.md` requires.

Where the instructions got in the way: R18 and G5 say "every new file under `src/lib/**`" must start with `import "server-only";`. But architecture.md Tests and `.claude/rules/tests.md` require colocated `*.test.ts` files, so test files necessarily live under `src/lib/**`, and the spec's Contract shows the directive only on module files. It is unclear whether test files are meant to be covered. I judged it as written (REVISE). If the intent is to exclude tests, R18, G5 and architecture.md Data access should say so explicitly.

**Orchestrator decision:** escalate. Every REVISE item is in qa-owned test files (`src/lib/**/*.test.ts`), which are locked and outside data-auth's paths, so a round-2 build cannot fix them ("a builder needs a path outside its owned paths"). Excluding tests from G5 would need an edit to `agents/reviewer.md`, which the orchestrator may not make. Human decision requested in-thread. **Human answer:** qa adds `import "server-only";` as line 1 of the three `src/lib/**` test files; R18 amended to say so. Round 2 runs qa (dispute mode, against amended R18), re-lock, qa post-build, re-diff, review.

## Round 2

| ID | Verdict | Evidence | Required outcome (REVISE/BLOCK only) |
|----|---------|----------|---------------------------------------|
| R1 | PASS | src/lib/session.ts:27-32 (exp = now + SESSION_TTL_SECONDS, HS256 sign), :36-38 (signSession), :41-55 (verify returns `{ name, expiresAt: new Date(exp*1000) }`) | |
| R2 | PASS | src/lib/session.ts:28-31: `new SignJWT({ name })`, `setProtectedHeader({ alg: "HS256" })`, `setExpirationTime(exp)` only (no `setIssuedAt` or other claims) | |
| R3 | PASS | src/lib/session.ts:43 (`!token` gives null for undefined and ""), :44-48 (`jwtVerify` with `algorithms: ["HS256"]` inside try), :50 (non-string or empty `name` gives null), :52-54 (catch gives null for malformed, tampered, wrong-secret, expired and wrong-alg tokens) | |
| R4 | PASS | src/lib/session.ts:14-22 (`secretKey()` reads `process.env.SESSION_SECRET` on each call; throws an `Error` naming SESSION_SECRET when it is unset, empty or under 32 characters; exactly 32 is accepted), :26 (sign) and :42 (verify, called outside the try so the error is not swallowed) | |
| R5 | PASS | src/lib/session.ts:58-68: one `(await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt })`. `expiresAt` comes from the same `exp` (:32), so it equals what verify returns (:51) | |
| R6 | PASS | src/lib/session.ts:71-74 (`cookieStore.delete(SESSION_COOKIE)` once) | |
| R7 | PASS | src/lib/auth/next-path.ts:5 (non-string or no leading `/` gives null), :7 (second char `/` or `\` gives null), :8-12 (any `\`, U+0000-U+001F or U+007F gives null), :13 (returns value unchanged) | |
| R8 | PASS | src/lib/auth/actions.ts:20 (`next` not trimmed before `safeNextPath`), :12-13 (`z.string().trim().min(1)`), :35 (`createSession(parsed.data.username)`, the trimmed value), :36 (`redirect(next ?? "/")`) | |
| R9 | PASS | src/lib/auth/actions.ts:21-24 (FormData values parsed; null and File fail `z.string()`), :26-32 (redirect to `/login?error=missing`, or `/login?` + `new URLSearchParams({ error: "missing", next })` when next is safe). `redirect` never returns, so `createSession` (:35) is not reached | |
| R10 | PASS | src/lib/auth/actions.ts:21-24 (the password only goes into `safeParse`), :35 (only the username goes on). No `console.*` call in any non-test file of the diff. The JWT payload is `{ name }` only (src/lib/session.ts:28) | |
| R11 | PASS | src/lib/auth/actions.ts:11-14 (`loginSchema` zod object), :21 (`safeParse`) | |
| R12 | PASS | src/lib/auth/actions.ts:40-45 (`await deleteSession()` then `redirect("/")`, no session check) | |
| R13 | PASS | src/lib/auth/actions.ts:18 and :41 (`"use server";` is the first statement of each body). Only `login` (:17) and `logout` (:40) are exported; `loginSchema` (:11) is not | |
| R14 | PASS | src/proxy.ts:10 (cookie from `request.cookies.get(SESSION_COOKIE)?.value`, then `verifySessionToken`), :12 (`NextResponse.redirect(new URL("/", request.url))`, default 307) | |
| R15 | PASS | src/proxy.ts:14 (`NextResponse.next()` when verify returns null) | |
| R16 | PASS | src/proxy.ts:17 (`export const config = { matcher: ["/login"] }`, a literal, no `runtime`), :10 (only `request.cookies` is read), :9-15 (no fetch, product lookup or other logic) | |
| R17 | PASS | .env.example:5-9 (comment says server-only, required, never NEXT_PUBLIC_, at least 32 characters, `openssl rand -base64 32`; `SESSION_SECRET=` is empty). Lines 1-4 (`CONTENTFUL_*`) are unchanged context lines | |
| R18 | PASS | First line `import "server-only";` in src/lib/session.ts:1, src/lib/auth/actions.ts:1, src/lib/auth/next-path.ts:1, src/lib/session.test.ts:1, src/lib/auth/actions.test.ts:1 and src/lib/auth/next-path.test.ts:1. No file-level `"use server"` in any `src/lib` file | |
| R19 | PASS | The diff has no hunk for `package.json` or the lockfile. The only files touched are .env.example and the eight src files listed under G1 | |
| G1 | PASS | Every file in the diff is owned. data-auth owns .env.example, src/lib/session.ts, src/lib/auth/actions.ts, src/lib/auth/next-path.ts and src/proxy.ts. qa owns src/lib/session.test.ts, src/lib/auth/actions.test.ts, src/lib/auth/next-path.test.ts and src/proxy.test.ts | |
| G2 | PASS | No `'use client'` anywhere in the diff | |
| G3 | PASS | No `<Suspense>` or `loading.tsx` in the diff (no `src/app` or `src/components` files) | |
| G4 | PASS | src/lib/session.ts:15 reads `process.env.SESSION_SECRET` (not `NEXT_PUBLIC_`). The error message at :17-19 does not include the secret value. The payload at :28 holds only the name. There are no log calls | |
| G5 | PASS | Same evidence as R18 | |
| G6 | PASS | The diff has no client islands and no files under `src/components/client/` | |

Overall: PASS

Notes:
- `verifySessionToken` is stricter than the R3 list: `requiredClaims: ["exp"]` (src/lib/session.ts:47) and the `typeof exp !== "number"` check (:50) also reject tokens without `exp`. This fits the contract's "null for any invalid token".
- `secretKey()` runs before the empty-token check (src/lib/session.ts:42-43). When SESSION_SECRET is unset, every `/login` request through the proxy (src/proxy.ts:10) throws, including requests with no cookie, and the visitor would likely see a server error. R4 requires this. The P04 and runtime docs should say SESSION_SECRET must be set before `/login` works.
- src/proxy.ts:3 imports `@/lib/session`, which pulls `server-only` and `next/headers` into the proxy bundle. The diff cannot show that Next 16 bundles this without error; only qa's `npm run build` can.
- R13 inline directives: whether Next 16 compiles `"use server"` inside exported top-level functions of a module that is not a `"use server"` file also cannot be seen in the diff. The spec chose this deliberately; the build check and the P03/P04 form usage will confirm it.

Where the instructions got in the way: I judged R19 ("package.json and the lockfile are unchanged") and G1 from what the diff does not contain. That only holds if the diff covers the whole working tree. The reviewer role cannot confirm this, because it may not run git or open other files.

**Orchestrator decision:** close. (Orchestrator confirmed the diff covers the whole working tree: it is `git diff --cached HEAD` after `git add -A`, excluding only `handoffs/`.)
