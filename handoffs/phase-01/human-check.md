# Phase 01: Human check

**Status:** closed (commit `feat(auth): phase 01 - auth core`; run `git log -1 --oneline` for the sha)
**Result:** PASSED (recorded by the orchestrator at the start of the phase 02 thread, 2026-10-20)

## Escalation

none open. Round 1 review returned REVISE on R18/G5 (three colocated tests under `src/lib/**` lacked `import "server-only";`). You decided in-thread that qa adds the import; R18 was amended and round 2 passed everything. Two doc follow-ups are yours, because the orchestrator can't edit these files: say in `docs/architecture.md` (Data access) and `agents/reviewer.md` (G5) that colocated `*.test.ts` files count, and note there that `src/lib/auth/actions.ts` uses function-level `"use server"` because of the `server-only` first-line rule.

## Verify it yourself (about 10 minutes)

Run from the repo root. There are no pages in this phase (`/login` arrives in P04), so the checks are unit tests plus the proxy over HTTP.

1. `npm test`. Expect: `Test Files  5 passed (5)` and `Tests  109 passed (109)`.
2. `npm run typecheck && npm run lint && scripts/check-client-boundary.sh`. Expect: exit 0 and `OK: client boundary respected`.
3. `env -u SESSION_SECRET npm run build`. Expect: success, with `ƒ Proxy (Middleware)` in the route list.
4. Proxy, in one shell:
   ```sh
   export SESSION_SECRET=$(openssl rand -base64 32)
   npx next start -p 3100 &
   TOKEN=$(node -e 'import("jose").then(async({SignJWT})=>console.log(await new SignJWT({name:"Sam"}).setProtectedHeader({alg:"HS256"}).setExpirationTime("7d").sign(new TextEncoder().encode(process.env.SESSION_SECRET))))')
   curl -sI -H "Cookie: session=$TOKEN" http://localhost:3100/login | grep -iE '^HTTP|^location'
   curl -sI http://localhost:3100/login | grep -iE '^HTTP|^location'
   curl -sI -H "Cookie: session=garbage" http://localhost:3100/login | grep -iE '^HTTP|^location'
   kill %1
   ```
   Expect, in order: `307 Temporary Redirect` + `location: /`; then `404 Not Found` twice (no redirect: the proxy passes through, and there's no `/login` page yet). The orchestrator ran exactly this before committing and got these results.
5. Read `src/lib/auth/next-path.ts` and `src/lib/auth/actions.ts` (about 60 lines in total). Check: `//evil.com`, `/\evil.com` and `https://…` can't get through `safeNextPath`; the password goes only into the zod parse, never into `createSession`; `"use server";` is the first statement inside `login` and `logout`.
6. `.env.example`: `SESSION_SECRET=` is present and empty, with a comment, and the `CONTENTFUL_*` lines are unchanged. Add a real `SESSION_SECRET` (≥ 32 characters) to your `.env.local` now: from P02 on, `/` throws without one.
7. View source and JS-disabled browser checks: n/a this phase (no rendered routes changed).

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>` (for example `/phase PASSED`). Or paste the prompt below, after filling in its `Human check:` line. `/phase` also turns on the orchestrator's path guard (D-029). This thread was started by pasting, so the guard was off.

```
You are the orchestrator. Follow agents/orchestrator.md exactly.
Read handoffs/STATE.md first.
Last completed: Phase 01 auth core (commit <sha from git log -1 --oneline>).
Human check for phase 01: <PASSED | FAILED: what you saw | FIXED MANUALLY: what you changed, commit sha>
Next: Phase 02 data layer, builder data-auth.
```
