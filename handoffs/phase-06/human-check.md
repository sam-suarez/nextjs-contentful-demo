# Phase 06: Human check

**Status:** closed (commit: see `git log --grep "phase 06"`)
**Result:** PASSED (2026-10-21, via the batch checklist; the report named only 04-fix1 as failed)

## Escalation

None new. Release is blocked only by OI-1 (`handoffs/ESCALATIONS.md`): `e2e/login.spec.ts` R17 fails, and it is the only failing check.

## Verify it yourself (about 10 minutes)

Run from the repo root, with `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` exported and a 32+ char `SESSION_SECRET`.

1. `rm -rf .next && npm run build`. Expect: exit 0, no warnings, `ƒ /`, `ƒ /login`, `◐ /products/[slug]`.
2. `npm run typecheck && npm run lint && npm test && scripts/check-client-boundary.sh`. Expect: all exit 0, `305 passed`, `OK: client boundary respected`.
3. `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh`. Expect: `551 passed, 0 failed`.
4. `npm run test:e2e`. Expect: `16 passed, 1 failed`, and the failure is `e2e/login.spec.ts` R17 (OI-1).
5. **Live Contentful** (not covered by the checks): with real `CONTENTFUL_*` values in `.env.local`, run `npm run build && npm start`. Expect the server log `[products] source: contentful` (or the live equivalent), the catalog showing the live products, and images loading from `images.ctfassets.net`.
6. `.env.example`: `CONTENTFUL_ENVIRONMENT=master` is a default value, not a credential. qa passed R9. Change it if "names only" should be strict (a data-auth one-liner).

## Continue in a new thread

Decide OI-1 first, then:

```
/phase FAILED: OI-1 decision = <1 proxy | 2 hard navigation | 3 generateStaticParams | 4 accept>
```
