# Phase 04-fix1: Human check

**Status:** closed (commit: see `git log --grep "phase 04-fix1"`)
**Result:** DEFERRED (batch run)

## Escalation

None. OI-1 is closed by this phase. A new non-blocking decision came up and is recorded as OI-2 in `handoffs/OPEN-ISSUES.md`: after a client-side sign-out, the previous Set B product page stays in the DOM, hidden by Next's `<Activity>`, until the next full page load.

## Verify it yourself (about 10 minutes)

Run from the repo root, with `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` exported and a 32+ char `SESSION_SECRET`.

1. `npm test`. Expect: `390 passed` (15 files).
2. `scripts/verify-ssr.sh`. Expect: `0 failed`. The server log in its output names `[products] members-only slugs loaded: 4` once.
3. `npm run build && npm start`, then `curl -sI http://localhost:3000/products/forest-friends-activity-cube`. Expect: `HTTP/1.1 307` and `location: /login?next=%2Fproducts%2Fforest-friends-activity-cube`.
4. `curl -sI http://localhost:3000/products/cloud-bunny-plush`. Expect: `200`, no `location`.
5. Browser: open `/products/forest-friends-activity-cube` logged out → you land on the sign-in page. Sign in with any name → you land on the Forest Friends Activity Cube page with "Member price $71.20" and the "Members only" badge (the OI-1 bug: you used to end on `/`).
6. Sign out → you are on `/` with "Sign in" in the header. Optional (OI-2): DevTools → Elements, search "Forest Friends" → the hidden previous page is still in the DOM until you reload.
7. `src/proxy.ts` and `src/lib/products/members-only.ts`: a quick read. The proxy only redirects; the page still asks the DAL.

## Continue in a new thread

This thread continues straight into phase 07 (human override). If you run this phase's check later and it fails, start a fix with:

```
/phase FAILED: phase 04-fix1 - <what you saw>
```
