# Phase 09: Human check

**Status:** closed (commit: see `git log -1` on `feature/member-savings`, `feat(data): phase 09 - savings percent`)
**Result:** <pending>

## Escalation

none

## Verify it yourself (about 10 minutes)

Run from the repo root, on the feature branch (`git switch feature/member-savings`).

1. `npx vitest run src/lib/products/savings.test.ts src/lib/products/to-catalog-product.test.ts src/lib/dal.test.ts src/lib/products/filter.test.ts`. Expect: all four files pass, no failures.
2. `npm test`. Expect: `Test Files  17 passed (17)` and `Tests  454 passed (454)`.
3. `head -1 src/lib/products/savings.ts`. Expect: `import "server-only";`.
4. `grep -rn "savingsPercent(" src --include='*.ts' --exclude='*.test.ts'`. Expect: the definition in `src/lib/products/savings.ts` and exactly one call, in `src/lib/products/to-catalog-product.ts` (the member branch); the everyday branch is a literal `null`.
5. `git diff df43efc --stat -- src/components src/app`. Expect: no output. Nothing renders the field yet (that's phase 10), so the site looks exactly as before.
6. Optional: `grep -n "savingsPercent(" src/lib/products/savings.test.ts | head -15`. Expect the contract cases, e.g. `(14, 11.2)` → `20`, `(3, 1)` → `67`, `(10, 10)` → `null`, `(0, 5)` → `null`. (The helper imports `server-only`, so it can't be tried in a plain Node REPL.)

## Result

`/ship` asks for the result in the same thread, right after this file is written (D-035): passed, failed (what you saw), or fixed by you (commit it with `Agent: manual` first). If the thread was stopped, run `/ship` with no argument to resume here.
