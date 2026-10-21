# Phase 04-fix2: Human check

**Status:** closed (commit: see `git log -1`, `feat(auth): phase 04-fix2 - sign-out full page load`)
**Result:** PASSED (2026-10-21, told to the orchestrator in the same thread)

## Escalation

None. This phase was escalated before spec earlier in the same thread (D-034 was not in the docs). The human lifted it by committing the D-034 docs edits (6d142c0) and choosing an Origin check and one phase with two builders.

## What changed

- Sign out is now a plain `<form method="post" action="/logout">`. `src/app/logout/route.ts` deletes the session cookie and answers 303 to `/`, so the browser loads `/` fresh. The members-only page you just left is gone from the DOM (OI-2 closed).
- `/logout` refuses cross-site posts: an `Origin` whose host doesn't match the request's host gets a 403.
- The old `logout` server action is removed. `src/lib/auth/actions.ts` exports only `login`.

## Verify it yourself (about 5 minutes)

Run from the repo root. First export `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` (empty, so the mock data is used) and a `SESSION_SECRET` of 32+ characters.

1. `npm test`. Expect: `414 passed` in 16 files.
2. `rm -rf .next && npm run build; echo "exit=$?"`. Expect: `exit=0`. `/`, `/login` and `/products/[slug]` show `◐`, and `/logout` shows `ƒ`.
3. `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh`. Expect: `495 passed, 0 failed`.
4. `npm run test:e2e`. Expect: `25 passed`.
5. `npm start`, then in the browser:
   - Sign in from `/products/forest-friends-activity-cube`.
   - Click **Sign out**. Expect: you land on `/` showing "Sign in", and the Network tab shows a document request (a full page load).
   - In DevTools → Elements, search for "Forest Friends". Expect: **0 results** without reloading. Before this fix it was still there.
6. `curl -si -X POST -H "Origin: https://evil.example" http://localhost:3000/logout | head -1`. Expect: `HTTP/1.1 403 Forbidden`.
7. `curl -si http://localhost:3000/logout | head -1`. Expect: `405`.

## Optional follow-ups (non-blocking)

- `docs/architecture.md` Routes says a foreign Origin is one that "differs from the app's origin". The code compares **hosts**, the same as Next's own Server Actions check, because under `next start` `request.url` is always `localhost`. You could reword the line to say "whose host differs from the request's `Host` (or `X-Forwarded-Host`)".
- The host comparison is exact. A client sending an uppercase `Host` or an explicit `:443` would get 403. That fails closed, and browsers don't do this.
- `AGENT.md` (the D-030 write-up) hasn't been written yet.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>`, for example `/phase PASSED`, `/phase FAILED: <what you saw>` or `/phase FIXED MANUALLY: <what you changed>, <sha>`. `/phase` is the only entry point: it turns on the orchestrator's path guard (D-029, D-033).
