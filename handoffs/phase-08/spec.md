# Phase 08: Release check

**Builder:** none (qa only)  ·  **Depends on:** phase 01 `bb5be94`, 02 `04e62d2`, 03 `06d1f58`, 04 (wip), 05 `f7dff1f`, 06, 04-fix1 `5f15cd8`, 07 `b6b3a9d`  ·  **Written by:** orchestrator

**Read:** architecture.md Stack, Server/client boundary, Data access, Auth, Tests; design.md none. qa reads only these.

## Goal

One run of every check against a clean production build (`next build && next start`) after phase 07 (D-031 Suspense skeletons) and 04-fix1 (D-032 proxy redirect), to decide whether the app is releasable. qa writes no new tests and changes no files. Each failure becomes a fix phase `phase-08-fixK` for the owner of the failing path.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | Clean build: after `rm -rf .next`, `npm run build` with `CONTENTFUL_SPACE_ID=`, `CONTENTFUL_ENVIRONMENT=`, `CONTENTFUL_DELIVERY_TOKEN=` exported empty and a ≥32-char `SESSION_SECRET` exits 0 with no errors. Record the route table and any warnings verbatim. `/`, `/login` and `/products/[slug]` as `◐` (Partial Prerender) or `ƒ` are both accepted (D-031: the static shell is prerendered, request-dependent parts stream) | architecture.md Stack, Tests; D-021, D-031 | command |
| R2 | `npm run typecheck` exits 0 | architecture.md Stack | command |
| R3 | `npm run lint` exits 0 | — | command |
| R4 | `npm test` passes (expect 390 tests; report the real numbers and file count) | architecture.md Tests | command |
| R5 | `scripts/check-client-boundary.sh` prints `OK: client boundary respected` | D-022 | command |
| R6 | `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh` against the R1 build: 0 failed (expect 474 passed; report the real number). This covers both directions on the response body and the Set B slug 307 with `Location: /login?next=/products/<slug>` | architecture.md Tests; D-013, D-020, D-031, D-032 | verify-ssr |
| R7 | `npm run test:e2e` against the R1 build: every test passes (expect 25; project `chromium` only, the `chromium-no-js` project was removed by D-031). No known failures remain (OI-1 is closed) | D-009, D-031, D-032 | e2e |
| R8 | Layout shift is stable: `npx playwright test e2e/layout-shift.spec.ts --repeat-each=3` against the R1 build passes every run (CLS < 0.01) | D-031; architecture.md Tests | e2e |
| R9 | Source scan (R8 of phase 06, inverted for D-031): (a) `<Suspense` appears in `src/app/page.tsx`, `src/app/products/[slug]/page.tsx`, `src/app/login/page.tsx` and `src/components/site-header.tsx`; (b) `grep -rn "export const instant" src` finds nothing; (c) `find src -name 'loading.tsx'` finds nothing; (d) `grep -rn NEXT_PUBLIC_ src` finds nothing; (e) every file under `src/lib/**` that is not a `*.test.ts` has `import "server-only";` as its first line; (f) `src/proxy.ts` exists and its matcher covers `/login` and `/products/:slug` | architecture.md Server/client boundary, Data access, Auth; D-020, D-031, D-032 | command |
| R10 | `.env.example` lists `SESSION_SECRET`, `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT`, `CONTENTFUL_DELIVERY_TOKEN` (names only, no real values; `CONTENTFUL_ENVIRONMENT=master` accepted by the human in P06) | architecture.md Auth, Data access | command |
| R11 | After all checks, `git status --short` shows no tracked or untracked changes outside `handoffs/` (build and test artifacts are git-ignored) | D-010 | command |

## Contract

No new code or tests. Commands and expected outputs are in the Requirements table. Failures are reported per requirement with the exact failing output, the file:line where possible, and the path's owner: data-auth `src/lib/**`, `src/proxy.ts`, `.env.example`; ui `src/app/**`, `src/components/**`, `next.config.ts`; qa `**/*.test.ts`, `scripts/verify-ssr.sh`, `e2e/**`, `playwright.config.ts`.

### Contract decisions

- Mock data only (D-021). A live Contentful run needs network and credentials, so it is a human step in `human-check.md`, not a check here.
- Phase 06's R8 asserted no `<Suspense>` anywhere; D-031 reverses that, so R9 asserts its presence in the four files phase 07 wrapped and keeps the other scans.
- R8 repeats the CLS test, as phase 07's post-build did, because a timing-dependent check that passes once is weak release evidence.

## Owned paths

| Role | May change |
|------|------------|
| qa | nothing (runs checks, writes `handoffs/phase-08/qa.md` only) |

`package.json` changes allowed: none.

## Checks

```sh
rm -rf .next
npm run build
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh
npm run test:e2e
npx playwright test e2e/layout-shift.spec.ts --repeat-each=3
# R9–R11 scans and git status as written above
```

## Out of scope

- Fixing anything (fix phases do that), editing tests, OI-2, live Contentful.

## Where the instructions got in the way

- None new. Same as phase 06: no builder, so steps 2 and 4 are skipped and qa runs in post-build mode against locked tests.
