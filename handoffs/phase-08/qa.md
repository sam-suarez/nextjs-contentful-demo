# Phase 08: QA

## Pre-build

none (no builder, no new tests; qa runs in post-build mode against locked tests).

## Post-build

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `rm -rf .next && npm run build` (env blanked, 40-char SESSION_SECRET) | PASS | |
| `npm run typecheck` | PASS | |
| `npm run lint` | PASS | |
| `npm test` (15 files, 390 tests) | PASS | |
| `scripts/check-client-boundary.sh` | PASS | |
| `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh` (474 passed, 0 failed) | PASS | |
| `npm run test:e2e` (25 passed, chromium) | PASS | |
| `layout-shift.spec.ts --repeat-each=3` (36 passed, 6 tests x 3 runs plus setup) | PASS | |
| R9 to R11 scans | PASS | |

Build route table (verbatim, no warnings or errors):

```
Route (app)
┌ ◐ /
├ ○ /_not-found
├ ◐ /login
└   /products/[slug]
  └ ◐ /products/[slug]

ƒ Proxy (Middleware)
```

| Requirement | Result |
|-------------|--------|
| R1 | PASS (build output clean; `/`, `/login`, `/products/[slug]` are ◐; exit code inferred from successful output, not captured) |
| R2 | PASS |
| R3 | PASS |
| R4 | PASS (390 tests, 15 files) |
| R5 | PASS |
| R6 | PASS (474 passed, 0 failed) |
| R7 | PASS (25/25) |
| R8 | PASS (all repeats passed) |
| R9 | PASS: (a) Suspense counts page.tsx 2, product page 1, login 1, site-header 1; (b) none; (c) none; (d) none; (e) no violations; (f) matcher `["/login", "/products/:slug"]` in src/proxy.ts:40 |
| R10 | PASS (four names present; CONTENTFUL_ENVIRONMENT=master, others empty) |
| R11 | PASS (`git status --short` shows only handoffs/ paths) |

**Overall:** PASS

## Dispute

none

## Open issues

none. Note: the R1 exit code was not captured directly (shell PIPESTATUS printed empty); the build finished with the full route table and no error output, and the later checks ran against it.

## Where the instructions got in the way

none
