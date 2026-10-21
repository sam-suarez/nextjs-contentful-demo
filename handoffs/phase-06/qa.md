# Phase 06: QA

## Pre-build

**Tests written:** none. Phase 06 is qa-only and adds no tests (spec "Contract": "No new code or tests").

| Requirement | Check | File |
|-------------|-------|------|
| none | none | none |

Requirements verified only by `review`: none

**Run output (trimmed):**

```
none (pre-build skipped, see spec "Where the instructions got in the way")
```

**Why each failure is the expected one:** none

## Post-build

Environment for every check: `CONTENTFUL_SPACE_ID=`, `CONTENTFUL_ENVIRONMENT=`, `CONTENTFUL_DELIVERY_TOKEN=` exported empty and a 42-char `SESSION_SECRET` exported (D-021). Locked tests: `shasum -a 256 -c handoffs/phase-06/tests.sha` reported all 20 files OK before the run. No file was edited.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `rm -rf .next && npm run build` | PASS | exit 0; `✓ Compiled successfully`; route table `ƒ /`, `○ /_not-found`, `ƒ /login`, `◐ /products/[slug]`, `ƒ Proxy (Middleware)`. Warnings: none (no `warn`/`error`/`⚠` lines in the log). Info line: `- Environments: .env.local`. The exported empty vars still win over it (verify-ssr below confirms mock data) |
| `npm run typecheck` | PASS | exit 0; `✓ Types generated successfully`, `tsc --noEmit` silent |
| `npm run lint` | PASS | exit 0, no output from `eslint` |
| `npm test` | PASS | `Test Files  14 passed (14)`, `Tests  305 passed (305)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh` | PASS | `INFO: VERIFY_SSR_SKIP_BUILD=1, using the existing .next build`; `verify-ssr: 551 passed, 0 failed`; `verify-ssr: PASS` |
| `npm run test:e2e` | FAIL (known OI-1 only) | 17 tests in 4 files, both projects ran (`chromium` 13, `chromium-no-js` 4). `16 passed`, `1 failed`: `[chromium] › e2e/login.spec.ts:8:5 › R17: …`, failing at `e2e/login.spec.ts:23` `getByText('Member price', { exact: true })` strict mode violation, `resolved to 13 elements` (the catalog grid, not the detail page). Same symptom as OI-1 in `handoffs/ESCALATIONS.md`. No skipped or flaky tests |
| R8 source scan | PASS | Suspense grep: no matches (rc 1); `find src -name 'loading.tsx'`: nothing; `NEXT_PUBLIC_` grep: no matches (rc 1); all 10 non-test files under `src/lib/**` start with `import "server-only";` (`session.ts`, `dal.ts`, `products/{contentful-adapter,source,filter,types,mock-adapter,to-catalog-product}.ts`, `auth/{actions,next-path}.ts`) |
| R9 `.env.example` | PASS | `SESSION_SECRET=` (l.9), `CONTENTFUL_SPACE_ID=` (l.2), `CONTENTFUL_ENVIRONMENT=master` (l.3), `CONTENTFUL_DELIVERY_TOKEN=` (l.4). No secrets. `master` is Contentful's default environment name, not a credential (see Open issues) |
| R10 `git status --short` | PASS | only ` M handoffs/STATE.md`, ` M handoffs/phase-05/human-check.md`, `?? handoffs/phase-06/`. Artifacts are ignored: `.next/`, `test-results/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` (plus `.env.local`, `node_modules/`) |

| Requirement | Result |
|-------------|--------|
| R1 | PASS (exit 0, no warnings; `/` and `/login` `ƒ`, `/products/[slug]` `◐` accepted) |
| R2 | PASS |
| R3 | PASS |
| R4 | PASS (305 tests in 14 files, as expected) |
| R5 | PASS |
| R6 | PASS (551 passed, 0 failed, as expected) |
| R7 | PASS under the spec's rule: the only failure is the known OI-1 test `e2e/login.spec.ts` R17. Both projects ran and there were no other failures. The suite itself exits 1 |
| R8 | PASS |
| R9 | PASS |
| R10 | PASS |

**Overall:** PASS, with the known OI-1 exception. Every check passes except `npm run test:e2e`, which exits 1 only because of the known, excluded R17 failure (OI-1). No fix phase is needed: there are no new failures, and spec "Contract decisions" excludes R17/OI-1 from fix phases. The app is not fully releasable until the human decides OI-1.

## Dispute

none

## Open issues

- **OI-1 (known, not new):** `e2e/login.spec.ts:23` R17 fails with the symptom recorded in `handoffs/ESCALATIONS.md` (13 "Member price" elements, i.e. the catalog at `/`). The owner depends on the human's OI-1 decision. Line 22 passed. That fits the known secondary test defect: `toHaveURL` has no start anchor, so it also matches `/login?next=/products/…`. I still think that assertion should be anchored to the pathname in a future dispute round. I did not change it.
- **R9 wording:** `.env.example` sets `CONTENTFUL_ENVIRONMENT=master`. "Names only, no real values" is aimed at secrets, and `master` is the public default environment name, so I recorded R9 as PASS. If the orchestrator reads "names only" strictly, this becomes a one-line data-auth fix (`.env.example`).

## Where the instructions got in the way

- R7 says "any other failure fails R7", but the Post-build template and `agents/qa.md` say "Overall is PASS only if every check passes". `npm run test:e2e` exits 1 because of the known exception. I reported the raw check as FAIL (known OI-1 only) and R7 as PASS under the spec's rule, so the orchestrator can see both readings.
