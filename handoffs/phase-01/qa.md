# Phase 01: QA

## Pre-build

**Tests written:** 103 tests in 4 files (plus 1 contract test for `SESSION_COOKIE` / `SESSION_TTL_SECONDS`). Every test name starts with its requirement ID.

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `R1: signSession returns a token verifySessionToken accepts with the same name`; `R1: the verified session's expiresAt is a Date 7 days (+-60 s) after signing`; `R1: the token is an HS256 JWT verifiable with the SESSION_SECRET bytes` | `src/lib/session.test.ts` |
| R2 | `R2: the JWT payload holds exactly the claims name and exp`; `R2: the protected header is { alg: HS256 }` | `src/lib/session.test.ts` |
| R3 | 14 tests: `undefined`; `""`; non-JWT strings; every payload character changed (loop); payload swapped for another name; every signature character changed (loop); different secret; past `exp`; HS512 same secret; HS384 same secret; unsecured `alg: none`; no `name`; empty `name`; non-string `name`. All assert `resolves.toBeNull()` (so a throw fails the test) | `src/lib/session.test.ts` |
| R4 | 9 tests: `signSession` and `verifySessionToken` each throw an `Error` containing `SESSION_SECRET` when it is unset / empty / 31 chars; exactly 32 chars accepted; `R4: SESSION_SECRET is read on every call, not once at module load`; `R4: a module loaded without SESSION_SECRET works once it is set` | `src/lib/session.test.ts` |
| R5 | `R5: createSession sets the session cookie exactly once`; `R5: createSession's cookie value verifies to the given name`; `R5: createSession passes exactly the spec'd cookie options (non-production)`; `R5: createSession sets secure: true when NODE_ENV is production` | `src/lib/session.test.ts` |
| R6 | `R6: deleteSession deletes the session cookie exactly once` | `src/lib/session.test.ts` |
| R7 | 26 `it.each` cases: 6 safe paths returned unchanged (`/products/x`, `/`, `/products/x?y=1`, a query with an encoded `next`, non-ASCII `/products/café`, `/%2F%2Fevil.com`); 15 unsafe strings → `null` (all spec examples plus `\r`, `\t`, U+0000, U+001F, U+007F, a leading space, `javascript:`, `///`); 5 non-strings → `null` (`undefined`, `null`, `42`, object, array) | `src/lib/auth/next-path.test.ts` |
| R8 | 8 tests: `createSession` called once with the trimmed username; the cookie verifies to the trimmed username; no `next` → `/` (after `createSession`); `next=/products/x` → `/products/x`; `//evil.com` → `/`; `https://evil.com` → `/`; ` /products/x` (not trimmed) → `/`; `/products/x?y=1` kept | `src/lib/auth/actions.test.ts` |
| R9 | 16 tests: 9 `it.each` cases (missing, empty, whitespace-only, `File` for each field, both missing) → `/login?error=missing` with one `redirect` call; 3 `it.each` cases with no cookie set and no `createSession` call; safe `next` → `/login?error=missing&next=%2Fproducts%2Fx`; safe `next` with a query → `URLSearchParams` encoding; `//evil.com` and `https://evil.com` dropped | `src/lib/auth/actions.test.ts` |
| R10 | `R10: the password is not in the cookie value or the JWT payload`; `R10: the password is not passed to createSession`; `R10: the password is not passed to redirect`; `R10: no console call receives the password, on success or on missing input` (spies on `console.log/info/warn/error/debug/trace`) | `src/lib/auth/actions.test.ts` |
| R12 | `R12: logout with no session deletes the session cookie, then redirects to /`; `R12: logout with a valid session deletes the session cookie, then redirects to /` (both check `deleteSession` was called once, `cookies().delete("session")`, `redirect("/")`, and the call order) | `src/lib/auth/actions.test.ts` |
| R13 (extra; spec says review) | `R13: actions.ts exports only login and logout` | `src/lib/auth/actions.test.ts` |
| R14 | 4 tests: valid cookie → 307 with `Location: http://localhost:3000/`; non-default origin kept; `?next` ignored; `session` found among other cookies | `src/proxy.test.ts` |
| R15 | 7 tests: no cookie; valid token under another cookie name; garbage; empty; tampered signature; expired; other secret. Each asserts no `Location`, status 200, `x-middleware-next: 1` | `src/proxy.test.ts` |
| R16 (matcher part) | `R16: config is exactly { matcher: ['/login'] } with no runtime option`. Also, `next/headers` `cookies()` is mocked to throw in `proxy.test.ts`, so any proxy that reads cookies from anywhere other than `request.cookies` fails the R14/R15 tests | `src/proxy.test.ts` |

Requirements verified only by `review`: R11, R13 (an exports check added as unit), R16 (the rest beyond matcher/runtime), R17, R18, R19. R10 is `unit + review`: the "any `console.*` call in the diff" part is also for the reviewer.

How the tests work: `next/headers` is mocked with an in-memory cookie store (`get`/`set`/`delete` spies). In `actions.test.ts` the `next/navigation` `redirect` mock throws, like the real one, and `@/lib/session` is wrapped (real functions inside `vi.fn` spies), so cookie and JWT checks run on real tokens. Every file sets `SESSION_SECRET` with `vi.stubEnv` in `beforeEach` and calls `vi.unstubAllEnvs()` in `afterEach`. No test reads `.env.local` or uses the network. There is one `describe` per file.

**Run output (trimmed):**

```
$ npm test
 FAIL  src/proxy.test.ts [ src/proxy.test.ts ]
Error: Cannot find package '@/lib/session' imported from .../src/proxy.test.ts
 FAIL  src/lib/session.test.ts [ src/lib/session.test.ts ]
Error: Cannot find package '@/lib/session' imported from .../src/lib/session.test.ts
 FAIL  src/lib/auth/actions.test.ts [ src/lib/auth/actions.test.ts ]
Error: Cannot find package '@/lib/auth/actions' imported from .../src/lib/auth/actions.test.ts
 FAIL  src/lib/auth/next-path.test.ts [ src/lib/auth/next-path.test.ts ]
Error: Cannot find package '@/lib/auth/next-path' imported from .../src/lib/auth/next-path.test.ts
 Test Files  4 failed | 1 passed (5)
      Tests  6 passed (6)          # the existing src/schemas/product.test.ts

$ npm run typecheck
✓ Types generated successfully
src/lib/auth/actions.test.ts(30,53): error TS2307: Cannot find module '@/lib/session' ...
src/lib/auth/actions.test.ts(38,26): error TS2307: Cannot find module '@/lib/auth/actions' ...
src/lib/auth/actions.test.ts(39,31): error TS2307: Cannot find module '@/lib/auth/actions' ...
src/lib/auth/actions.test.ts(40,79): error TS2307: Cannot find module '@/lib/session' ...
src/lib/auth/next-path.test.ts(2,30): error TS2307: Cannot find module '@/lib/auth/next-path' ...
src/lib/session.test.ts(21,8): error TS2307: Cannot find module '@/lib/session' ...
src/lib/session.test.ts(264,32): error TS2307: Cannot find module '@/lib/session' ...
src/proxy.test.ts(12,29): error TS2307: Cannot find module '@/lib/session' ...
src/proxy.test.ts(13,31): error TS2307: Cannot find module '@/proxy' ...

$ npm run lint
(no output: clean)
```

**Why each failure is the expected one:** every failure is "module not found" for `@/lib/session`, `@/lib/auth/actions`, `@/lib/auth/next-path` or `@/proxy`. These are the four modules this phase creates, and none exists at base `589dd98`. Typecheck shows only TS2307 for the same modules. There are no other errors.

To show the failures are not test bugs, I checked the tests outside the repo before handing over:
- I wrote a throwaway reference implementation of the four modules from the spec contract, in the session scratchpad. It is not in `src/` and not committed. I ran these tests against it through a scratch Vitest config that aliases the four module ids: **4 files, 103 tests, all pass**. `tsc` on the test files against the same reference: **exit 0**.
- Mutation checks against that reference. Each mutant fails at least one test:
  - dropping `algorithms: ["HS256"]` fails the HS512 and HS384 tests
  - `expires` computed from `Date.now()` fails R5
  - adding `iat` fails R2
  - accepting 31 characters fails R4
  - an untrimmed username fails R8
  - a proxy that reads `next/headers` fails R14 and R15
  - a hard-coded origin fails R14
- One mutant survived: removing the separate "second character is `\`" check. It is equivalent, because R7's "contains no `\`" already rejects `/\evil.com`.

## Post-build

### Round 2

Run 2026-10-20 from the repo root, after the R18 dispute fix. I edited no tests in this round. All five test files hash to the values in the re-locked `handoffs/phase-01/tests.sha` (`shasum -a 256` was checked against every line). The first line of each of the three `src/lib/**` test files and the three `src/lib/**` modules is `import "server-only";`. `SESSION_SECRET` was not set in the shell and is not in `.env.local`. `npm run build` ran under `env -u SESSION_SECRET`.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit` -> `✓ Types generated successfully`, exit 0, no errors |
| `npm run lint` | PASS | `eslint`: no output, exit 0 |
| `npm test` | PASS | `Test Files 5 passed (5)`, `Tests 109 passed (109)` (103 phase tests + 6 existing `product.test.ts`). The verbose reporter shows 0 skipped, 0 todo, 0 failed |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected`, exit 0 |
| `npm run build` | PASS | `✓ Compiled successfully`, `✓ Generating static pages using 5 workers (4/4)`, routes `○ /`, `○ /_not-found`, `ƒ Proxy (Middleware)`, exit 0. Built without `SESSION_SECRET` |
| `scripts/verify-ssr.sh` | n/a (P03) | not in this phase's Checks |
| `npm run test:e2e` | n/a (P04) | not in this phase's Checks |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (3/3 tests) |
| R2 | PASS (2/2) |
| R3 | PASS (14/14) |
| R4 | PASS (9/9) |
| R5 | PASS (4/4) |
| R6 | PASS (1/1) |
| R7 | PASS (26/26) |
| R8 | PASS (8/8) |
| R9 | PASS (16/16) |
| R10 | PASS for the unit part (4/4); the "`console.*` in the diff" part is for review |
| R11 | review only (not checked by qa) |
| R12 | PASS (2/2) |
| R13 | PASS for the exports check (1/1); `"use server"` placement is for review |
| R14 | PASS (4/4) |
| R15 | PASS (7/7) |
| R16 | PASS for the matcher/runtime check (1/1); the rest is for review |
| R17, R19 | review only (not checked by qa) |
| R18 | review only. Observed while running: line 1 is `import "server-only";` in all six new `src/lib/**` files (3 modules, 3 tests) |
| Contract (`SESSION_COOKIE`, `SESSION_TTL_SECONDS`) | PASS (1/1) |
| Spec "build without `SESSION_SECRET`" | PASS |

**Overall:** PASS

### Round 1

Run 2026-10-20 from the repo root. Tests not edited: all four test files are older than the pre-build `qa.md` write and the implementation files. `SESSION_SECRET` was not set in the shell or in `.env.local` for any check, and `npm run build` ran under `env -u SESSION_SECRET`.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit` -> `✓ Types generated successfully`, exit 0, no errors |
| `npm run lint` | PASS | `eslint`: no output, exit 0 |
| `npm test` | PASS | `Test Files 5 passed (5)`, `Tests 109 passed (109)` (103 phase tests + 6 existing `product.test.ts`). 0 skipped, 0 todo, 0 failed |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected`, exit 0 |
| `npm run build` | PASS | `✓ Compiled successfully`, `✓ Generating static pages (4/4)`, routes `○ /`, `○ /_not-found`, `ƒ Proxy (Middleware)`, exit 0. Built without `SESSION_SECRET` |
| `scripts/verify-ssr.sh` | n/a (P03) | not in this phase's Checks |
| `npm run test:e2e` | n/a (P04) | not in this phase's Checks |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (3/3 tests) |
| R2 | PASS (2/2) |
| R3 | PASS (14/14) |
| R4 | PASS (9/9) |
| R5 | PASS (4/4) |
| R6 | PASS (1/1) |
| R7 | PASS (26/26) |
| R8 | PASS (8/8) |
| R9 | PASS (16/16) |
| R10 | PASS for the unit part (4/4); the "`console.*` in the diff" part is for review |
| R11 | review only (not checked by qa) |
| R12 | PASS (2/2) |
| R13 | PASS for the exports check (1/1); `"use server"` placement is for review |
| R14 | PASS (4/4) |
| R15 | PASS (7/7) |
| R16 | PASS for the matcher/runtime check (1/1); the rest is for review |
| R17, R18, R19 | review only (not checked by qa) |
| Contract (`SESSION_COOKIE`, `SESSION_TTL_SECONDS`) | PASS (1/1) |
| Spec "build without `SESSION_SECRET`" | PASS |

**Overall:** PASS

## Dispute

**Round 2.** Disputed: `src/lib/session.test.ts`, `src/lib/auth/actions.test.ts`, `src/lib/auth/next-path.test.ts`. Cited line: spec R18 as amended after review round 1 ("Every new file under `src/lib/**`, **including colocated `*.test.ts` files** ... has `import \"server-only\";` as its first line"), plus the spec's Owned paths qa row ("the three under `src/lib/**` must start with `import \"server-only\";`, R18"). `build.md` "Open issues" lists no disputed test. This dispute comes from the R18 amendment, not from the builder.

**Decision:** the tests were wrong, so I fixed them. None of the three files started with `import "server-only";`: their first lines were `import { SignJWT, ... } from "jose";`, `import { decodeJwt } from "jose";` and `import { describe, ... } from "vitest";`. That breaks amended R18. architecture.md agrees: Data access says "Every file in `src/lib/**` starts with `import \"server-only\";`", and Tests says "`server-only` is aliased to an empty module in `vitest.config.mts`". `vitest.config.mts` does alias it to `node_modules/server-only/empty.js`, so the import has no runtime effect in tests. The spec and architecture.md do not disagree, so there is nothing to escalate.

**Change:** I prepended `import "server-only";` as line 1 of each of the three files. No other line changed: no assertion, mock or test name was touched (`git diff`: +1 line per file). `src/proxy.test.ts` is outside `src/lib/**`, so R18 does not apply to it and it is unchanged. `src/schemas/product.test.ts` is also unchanged.

**Run after the fix (2026-10-20):**

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm test` | PASS | `Test Files 5 passed (5)`, `Tests 109 passed (109)` |
| `npm run typecheck` | PASS | `✓ Types generated successfully`, exit 0 |
| `npm run lint` | PASS | no output, exit 0 |

**New hashes** (`handoffs/phase-01/tests.sha` is outdated for these three. The orchestrator owns re-locking):

```
9a2c811e3570d20a83d2e16a877846101688349cb6443e4e77e5e8fa0dc9b841  src/lib/session.test.ts
4e0599fe7c3c398a7ab37638a4e957bcc356107bed7f270e50b5233c453e8b0c  src/lib/auth/actions.test.ts
e4d5baa3e5e034a12d6f6517ac8ed387704984577bc37fbf9dc8d5629952a1ec  src/lib/auth/next-path.test.ts
```

Unchanged: `src/proxy.test.ts` `9a8ba744...6297` and `src/schemas/product.test.ts` `e4cd3282...f6c4`.

## Open issues

Post-build (rounds 1 and 2): none. I don't think any of my tests is wrong now that they have run against the build. The pre-build notes below still apply.

These are not blockers. They are judgement calls a builder might dispute:

- **R2 header:** the test asserts the protected header is exactly `{ alg: "HS256" }`, not just `alg === "HS256"`. Source: the Contract ("protected header `{ "alg": "HS256" }`", "Nothing here is optional"). A builder who adds `typ: "JWT"` will fail this test.
- **R5 `expires`:** the test asserts `expires.getTime() === session.expiresAt.getTime()`, exact to the millisecond ("a Date equal to the token's expiresAt"). Building `expires` from `Date.now()` instead of from the token's `exp` fails.
- **R4 for `verifySessionToken`:** the "throws" tests pass a real token, not `undefined`. A builder may short-circuit on a missing token before checking the secret, and the spec does not decide that case. So it is not tested.
- **R13:** the spec marks it `review`. I added a unit check that `actions.ts` exports exactly `login` and `logout`. It cannot check the `"use server"` placement, which stays with the reviewer.
- **R7 derived positives:** `/products/café` and `/%2F%2Fevil.com` must be returned unchanged. Both follow from R7's exact rule (non-ASCII is not an ASCII control character; nothing is decoded). A builder who decodes or rejects percent-encoding would fail.

## Where the instructions got in the way

- The Next 16 proxy doc (`proxy.md`, "Unit testing") names the matcher helper `unstable_doesProxyMatch`, but `next/experimental/testing/server` in 16.4.2 only exports `unstable_doesMiddlewareMatch`. I did not use either: R16 asks for a constant literal, so `toEqual({ matcher: ["/login"] })` decides it exactly.
- `agents/qa.md` input 5 (`products.mock.json`, `src/schemas/product.ts`) does not apply to an auth-only phase. I skipped it, since no product values are involved.
