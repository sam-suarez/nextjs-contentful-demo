# Phase 08: Human check

**Status:** closed (commit: see `git log --grep "phase 08"`)
**Result:** PASSED (2026-10-21, via the batch checklist; the report named only 04-fix1 as failed)

## Escalation

None. Every check passed against a clean `next build && next start`; no fix phases were opened. OI-2 (hidden Set B DOM after sign-out) stays open and non-blocking.

## Verify it yourself (about 10 minutes)

Run from the repo root, with `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` exported and a 32+ char `SESSION_SECRET`.

1. `rm -rf .next && npm run build; echo "exit=$?"`. Expect: `exit=0`, no warnings, `◐ /`, `◐ /login`, `◐ /products/[slug]`. (qa did not capture the exit code directly; this closes that gap.)
2. `npm run typecheck && npm run lint && npm test && scripts/check-client-boundary.sh`. Expect: all exit 0, `390 passed` (15 files), `OK: client boundary respected`.
3. `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh`. Expect: `474 passed, 0 failed`.
4. `npm run test:e2e`. Expect: `25 passed`, one project (`chromium`).
5. `npx playwright test e2e/layout-shift.spec.ts --repeat-each=3`. Expect: `36 passed`.
6. `grep -rln "<Suspense" src/app src/components/site-header.tsx; grep -rn "export const instant\|NEXT_PUBLIC_" src; find src -name loading.tsx`. Expect: the three page files and `site-header.tsx`, then nothing else.
7. **Live Contentful** (not covered by the checks): with real `CONTENTFUL_*` values in `.env.local`, `npm run build && npm start`. Expect the server log to name the live source, the catalog to show the live products with images from `images.ctfassets.net`, and the skeletons to swap in without a visible jump (sizes were tuned to mock data).

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>`, for example `/phase PASSED`, `/phase FAILED: <what you saw>` or `/phase FIXED MANUALLY: <what you changed>, <sha>`. `/phase` is the only entry point: it turns on the orchestrator's path guard (D-029, D-033).
