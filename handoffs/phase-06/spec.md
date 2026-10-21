# Phase 06: Release check

**Builder:** none (qa only)  ·  **Depends on:** phase 01 `bb5be94`, 02 `04e62d2`, 03 `06d1f58`, 04 `9c79ec9` (wip, OI-1 open), 05 `f7dff1f`  ·  **Written by:** orchestrator

## Goal

One run of every check against a clean production build (`next build && next start`), including the JS-disabled Playwright project, to decide whether the app is releasable. qa writes no new tests and changes no files. Each failure becomes a fix phase `phase-06-fixK` for the owner of the failing path.

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | Clean build: after `rm -rf .next`, `npm run build` with `CONTENTFUL_SPACE_ID=`, `CONTENTFUL_ENVIRONMENT=`, `CONTENTFUL_DELIVERY_TOKEN=` exported empty and a ≥32-char `SESSION_SECRET` exits 0 with no errors. The route table shows `/` and `/login` as `ƒ`; `/products/[slug]` as `◐` is accepted (P04 Amendments round 3). Record any warnings verbatim | architecture.md Stack, Tests; D-021 | command |
| R2 | `npm run typecheck` exits 0 | architecture.md Stack | command |
| R3 | `npm run lint` exits 0 | — | command |
| R4 | `npm test` passes (expect 305 tests in 14 files; report the real numbers) | architecture.md Tests | command |
| R5 | `scripts/check-client-boundary.sh` prints `OK: client boundary respected` | D-022 | command |
| R6 | `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh` against the R1 build: 0 failed (expect 551 passed) | architecture.md Tests; D-013, D-020 | verify-ssr |
| R7 | `npm run test:e2e` against the R1 build runs both projects (`chromium`, `chromium-no-js`). Every test passes except `e2e/login.spec.ts` R17, which is the known failure OI-1 (`handoffs/OPEN-ISSUES.md`): report it as known, not as a new failure. Any other failure fails R7 | D-009; agents/qa.md (Playwright no-JS project) | e2e |
| R8 | Source scan: `grep -rn "<Suspense\|from \"react\".*Suspense" src` finds nothing; `find src -name 'loading.tsx'` finds nothing; `grep -rn NEXT_PUBLIC_ src` finds nothing; every file under `src/lib/**` that is not a `*.test.ts` has `import "server-only";` as its first line | architecture.md Server/client boundary, Data access; D-020 | command |
| R9 | `.env.example` lists `SESSION_SECRET`, `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT`, `CONTENTFUL_DELIVERY_TOKEN` (names only, no real values) | architecture.md Auth, Data access | command |
| R10 | After all checks, `git status --short` shows no tracked or untracked changes outside `handoffs/` (build and test artifacts are git-ignored) | D-010 | command |

## Contract

No new code or tests. Commands and expected outputs are in the Requirements table. Failures are reported per requirement with the exact failing output, the file:line where possible, and the path's owner (from the ownership table in `agents/orchestrator.md`: data-auth `src/lib/**`, `src/proxy.ts`, `.env.example`; ui `src/app/**`, `src/components/**`, `next.config.ts`; qa tests, `scripts/verify-ssr.sh`, `e2e/**`, `playwright.config.ts`).

### Contract decisions

- Mock data only (D-021). A live Contentful run needs network and credentials, so it is a human step in `human-check.md`, not a check here.
- R17 / OI-1 is not turned into a fix phase: who owns the fix depends on the human's OI-1 decision.

## Owned paths

| Role | May change |
|------|------------|
| qa | nothing (runs checks, writes `handoffs/phase-06/qa.md` only) |

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
# R8–R10 greps and git status as written above
```

## Out of scope

- Fixing anything (fix phases do that), editing tests, OI-1, live Contentful.

## Where the instructions got in the way

- The phase plan says "qa only", but `agents/orchestrator.md` steps 2 (pre-build) and 4 (build) assume a builder. Steps 2 and 4 are skipped. qa runs in post-build mode, and steps 3 and 5 still lock the tests so the run is against the committed checks.
