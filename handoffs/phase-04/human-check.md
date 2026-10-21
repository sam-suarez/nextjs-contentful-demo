# Phase 04: Human check

**Status:** escalated (committed as `wip(detail): phase 04 - detail + login (escalated: …)` under the batch-run override)
**Result:** PASSED (2026-10-21, via the batch checklist; the report named only 04-fix1 as failed)

## Escalation

R17 fails after 3 build rounds: signing in from the members-only redirect lands on `/` instead of the product. Evidence, cause, and the four options are in `handoffs/ESCALATIONS.md` OI-1 (failing line `e2e/login.spec.ts:23`; mechanism in `node_modules/next/dist/client/components/layout-router.js` / `redirect-boundary.js`; trace in `handoffs/phase-04/qa.md` "Post-build, round 3"). No reviewer pass ran this round: the round limit had already decided the outcome.

## Verify it yourself (about 10 minutes)

Run from the repo root.

1. `npm run build && npm start`. Expect: build OK, with `/products/[slug]` marked `◐` and `/` and `/login` marked `ƒ`.
2. `scripts/verify-ssr.sh`. Expect: `380 passed, 0 failed`.
3. `npm run test:e2e`. Expect: 2 passed, 1 failed (`e2e/login.spec.ts`, R17). That failure is the escalation.
4. Browser, logged out: `http://localhost:3000/products/cloud-bunny-plush`. Expect: breadcrumb, h1 "Cloud Bunny Plush", "Everyday price" $28.00, "Sign in for member pricing" button linking to `/login?next=/products/cloud-bunny-plush`.
5. Browser, logged out: `/products/forest-friends-activity-cube`. Expect: you land on `/login?next=/products/forest-friends-activity-cube`. Sign in with any name and password. **Known bug:** you end up on `/` instead of the product. Open the product from the grid: it bounces again. Reload, then open it: it works ("Member price" $71.20, "Members only" badge next to the h1).
6. Browser: `/products/no-such-toy`. Expect: the "404" pill, "We can't find that toy", and a "Back to catalog" button.
7. Browser: `/login`, then submit empty fields. Expect: `?error=missing` with the alert, and `next` is kept when it was there.
8. JS disabled: `/products/cloud-bunny-plush`. Expect: the same content and price as step 4. Then `/products/forest-friends-activity-cube`. Expect: an empty shell with **no** name, $71.20, $89.00 or description (accepted in round 3: no redirect without JS).
9. View source of `/products/forest-friends-activity-cube`, logged out: search for `71.20` and `Forest Friends`. Expect: absent.

## Continue in a new thread

Decide OI-1 first (`handoffs/ESCALATIONS.md`), then:

```
/phase FAILED: OI-1 decision = <1 proxy | 2 hard navigation | 3 generateStaticParams | 4 accept>
```
