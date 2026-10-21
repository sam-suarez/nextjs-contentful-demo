# Phase 04-fix2: Build (ui, step A, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/app/logout/route.ts` | created: `POST` only route handler; Origin host vs `x-forwarded-host` (first, trimmed) ?? `host` ?? `request.url` host; foreign/unparseable/`null` -> 403; else `await deleteSession()` then 303 `Location: /` | R1, R2, R3, R4, R5, R6, R7 |
| `src/components/site-header.tsx` | edited: Sign out is `<form method="post" action="/logout" className="shrink-0">` (button unchanged); `logout` import removed | R8, R9 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | FAIL (expected until step B) | `FAIL src/lib/auth/actions.test.ts > auth actions > R10 (04-fix2): actions.ts exports only login` (413 passed, 1 failed) |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | `/`, `/login`, `/products/[slug]` `◐`; `/logout` `ƒ` |
| `scripts/verify-ssr.sh` | PASS | 495 passed, 0 failed |
| `npm run test:e2e` | PASS | 25 passed (incl. `login.spec.ts` R11, `layout-shift.spec.ts`) |
| R9 grep | PASS | no output |

## Open issues

- Expected, not a dispute (spec Contract decisions): `actions.test.ts` "R10 (04-fix2): actions.ts exports only login" stays red until step B (data-auth removes `logout` from `src/lib/auth/actions.ts`). Nothing under `src/` imports `logout` any more.

## Where the instructions got in the way

- `.claude/rules/ssr-rendering.md` says "Call the DAL in `src/lib/dal.ts`" for everything under `src/app/**`, while the spec and architecture.md Auth have the route handler import `deleteSession()` from `@/lib/session`. I followed the spec; the rule could name route handlers as the exception.

---

# Phase 04-fix2: Build (data-auth, step B, round 1)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `src/lib/auth/actions.ts` | edited: `logout` server action removed, `deleteSession` dropped from the `@/lib/session` import; `login` untouched (only export) | R10, R9 |

## Fixes this round

none

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` | PASS | 414 passed |
| `scripts/check-client-boundary.sh` | PASS | |
| `npm run build` | PASS | `/`, `/login`, `/products/[slug]` `◐`; `/logout` `ƒ` |
| `scripts/verify-ssr.sh` | PASS | 495 passed, 0 failed |
| `npm run test:e2e` | PASS | 25 passed |
| R9 grep | PASS | no output |

## Open issues

none

## Where the instructions got in the way

- One `build.md` for two builders in one phase: the template assumes one. I appended step B below ui's step A section instead of overwriting it.
