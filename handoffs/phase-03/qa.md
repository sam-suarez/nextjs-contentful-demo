# Phase 03: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R8 | `R8: formatPrice formats 11.2 as $11.20`, `... whole number with two decimals (9 -> $9.00)`, `... 71.2 as $71.20`, `... 0 as $0.00`, `... groups thousands (1234.5 -> $1,234.50)`, `... matches Intl en-US USD currency output for every mock price` (all 24 prices from `products.mock.json`) | `src/components/format.test.ts` |
| R9 | `R9: formatToyCount` 0 / 1 / 2, 8, 12; `R9: memberBannerText` 4 / 1 / 0; `R9: emptyStateMessage` non-empty, padded non-empty, `""`, whitespace-only; `R9: LOGGED_OUT_BANNER_TEXT is the exact logged-out banner sentence`; `R9: banner strings use the straight apostrophe U+0027` | `src/components/format.test.ts` |
| R10 | `R10: LAYOUTS is exactly price then specs`; defaults for `{}`; every `CATEGORIES` value accepted; `robots`, `""`, `Bath` -> null; array category uses (and validates) the first element; q trimmed / missing -> `""` / array -> first; layout `specs` only for exactly `specs`; `price`, `bogus`, `SPECS`, missing -> `price`; array layout -> first; unknown keys ignored (exact result object); never throws for `undefined` values or empty arrays | `src/components/catalog-params.test.ts` |
| R11 | `R11: catalogHref` for all 8 spec cases (`{}`, `{category:"bath"}`, full triple with `soft+toy`, `{q:"  "}`, `{layout:"price"}`, `{layout:"specs"}`, `{q:"a&b"}`, `{category:null,...}`), plus fixed key order whatever the input order, trimmed q, and a round trip through `parseCatalogParams` | `src/components/catalog-params.test.ts` |
| R12 | `R12: CATEGORY_META has exactly the six CATEGORIES as keys`; `... each entry has exactly label, color and icon`; one `it` per category (label, colour, icon identity with `toBe` against the `lucide-react` export); `R12: categoryLabel returns CATEGORY_META[c].label for every category` | `src/components/categories.test.ts` |
| R7 (verify-ssr part) | `R7: footer text 'Tiny Confetti demo catalog'`, `R7: footer text 'Prices in USD. Member prices need sign-in.'`, `R7: '<footer' occurs at least once` (on `/`) | `scripts/verify-ssr.sh` |
| R13 (verify-ssr part) | Covered by the R15/R16 session-dependent output (page uses `verifySession`/`getProducts`) and R18 (no `<Suspense>` streaming or fallback on every page) | `scripts/verify-ssr.sh` |
| R15 | status 200; 8 public names present; 4 authenticated names absent; `>Everyday price<` x8, `>Member price<` x0; 8 everyday prices present; 12 member prices absent; `$89.00 $54.00 $68.00 $36.00` absent; no `>Members only<` / `>Member pricing<`; logged-out banner (escaped); `href="/login"`, `>Sign in<`; no `$ACTION_ID_`, no `Signed in as`; `>8 toys<`; `<article` x8 | `scripts/verify-ssr.sh` |
| R16 | cookie minted with jose (`{ name: "ssr-checker", exp }`, HS256, script's own secret): status 200; 12 names present; first occurrences in name order; `>Member price<` x12, `>Everyday price<` x0; 12 member prices present; 12 everyday prices absent; `>Members only<` x4; member banner (escaped); `>Member pricing<`, `Signed in as`, `>ssr-checker<`, `>Sign out<`, `$ACTION_ID_`; no `href="/login"`, no logged-out banner; `>12 toys<`; `<article` x12 | `scripts/verify-ssr.sh` |
| R17 | `session=not-a-jwt`: authenticated names absent; `>Everyday price<` x8; `>Member price<` x0; 12 member prices absent | `scripts/verify-ssr.sh` |
| R18 | on all 13 fetched pages: no `<div hidden id="S:`, no `<!--$?-->`, no `<template id="B:`, no `Loading` | `scripts/verify-ssr.sh` |
| R19 | (a) to (g) exactly as listed in the spec, including whole-tag `<a>` lookups for `aria-current="true"` (count and href) and `<input name="q" value="washable">`; each page also asserts status 200 | `scripts/verify-ssr.sh` |
| R20 | on `/?q=washable&layout=specs`: Bath chip, All chip and Price first hrefs (escaped form), hidden `layout=specs` input, no `name="category"` input, `<form action="/">`; on `/?category=bath&layout=specs`: hidden `category=bath` input; on every fetched page: `href="/"` and `>Clear filters<` | `scripts/verify-ssr.sh` |
| R21 | `href="/products/cloud-bunny-plush"` x1; `<img>` with that `src` and `alt`; `>Picture coming soon<` x1; no tag with `src="/products/bubble-bath-whale.svg"`; `<h1` x1; `>Toy catalog<`; tagline; `<main` x1; `<header` >= 1; `>Tiny Confetti<` | `scripts/verify-ssr.sh` |
| R22 | `>Search<` >= 2; placeholder attribute; seven chip labels with first occurrences in order; `>Layout<`, `>Price first<`, `>Specs first<` | `scripts/verify-ssr.sh` |
| R23 | server log contains `[products] source: mock` (checked after all requests; the readiness probe hits `/favicon.ico`, so it does not trigger the product fetch) | `scripts/verify-ssr.sh` |
| R14 | Command, run post-build: `env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build` | spec Checks |
| R32 (command part) | `scripts/check-client-boundary.sh` prints `OK: client boundary respected` | Checks |

Requirements verified only by `review`: R1, R2, R3, R4, R5, R6, R24, R25, R26, R27, R28, R29, R30, R31, R33 (and the review parts of R7, R13, R32).

`scripts/verify-ssr.sh` follows the spec's script contract: `#!/usr/bin/env bash`, `set -euo pipefail`, executable, `cd`s to the repo root; exports the three `CONTENTFUL_*` vars as empty strings and a generated `SESSION_SECRET` (`verify-ssr-` + 48 hex chars, never read from `.env.local`); runs `npm run build` unless `VERIFY_SSR_SKIP_BUILD=1`; refuses to run if something already answers on the port; starts `npm start -- --port $VERIFY_SSR_PORT` (default 3210) in its own process group with output to a temp log; waits up to 60 s; a `trap cleanup EXIT` kills the whole process group (npm and next) every time; curl never follows redirects; tag lookups are a small node helper that matches whole tags and compares attributes in any order (escaped form); one `PASS:`/`FAIL:` line per assertion, a summary, non-zero exit on any failure. On failure the temp dir (pages, server log, build log) is kept and its path printed.

**Run output (trimmed):**

```
$ npx vitest run src/components
 FAIL  src/components/catalog-params.test.ts
Error: Cannot find package '@/components/catalog-params' imported from .../src/components/catalog-params.test.ts
 FAIL  src/components/categories.test.ts
Error: Cannot find package 'lucide-react' imported from .../src/components/categories.test.ts
 FAIL  src/components/format.test.ts
Error: Cannot find package '@/components/format' imported from .../src/components/format.test.ts
 Test Files  3 failed (3)
      Tests  no tests

$ npm test
 Test Files  3 failed | 11 passed (14)
      Tests  251 passed (251)          # earlier phases unaffected

$ npm run typecheck
src/components/catalog-params.test.ts(2,58): error TS2307: Cannot find module '@/components/catalog-params' ...
src/components/catalog-params.test.ts(3,38): error TS2307: Cannot find module '@/components/catalog-params' ...
src/components/categories.test.ts(1,59): error TS2307: Cannot find module 'lucide-react' ...
src/components/categories.test.ts(3,46): error TS2307: Cannot find module '@/components/categories' ...
src/components/format.test.ts(8,8): error TS2307: Cannot find module '@/components/format' ...

$ npx eslint src/components scripts
(no output, exit 0)

$ scripts/verify-ssr.sh                         # default: builds first
INFO: npm run build (CONTENTFUL_* blank, own SESSION_SECRET)
src/components/format.test.ts(8,8): error TS2307: Cannot find module '@/components/format' ...
Failed to type check.
FAIL: setup: npm run build succeeds
exit=1

# Assertion logic exercised against the current scaffold page: tests moved aside,
# `env SESSION_SECRET= CONTENTFUL_*= npm run build` (exit 0), tests restored, then:
$ VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh
INFO: server up on http://127.0.0.1:3210
FAIL: R15: logged out contains public name 'Bubble Bath Whale'      (x8 names)
FAIL: R15: '>Everyday price<' occurs exactly 8 times
FAIL: R15: logged out contains everyday price $14.00                 (x8 prices)
FAIL: R16: logged in contains 'Bubble Bath Whale' ... first occurrences in name order ... '>Member price<' x12 ...
FAIL: R19a..g: every presence, count and aria-current assertion
FAIL: R20: every href / hidden input / form assertion; [all 13 pages] href="/" and '>Clear filters<'
FAIL: R21: cloud-bunny link, <img>, Picture coming soon, Toy catalog, tagline, <header, Tiny Confetti
FAIL: R22: all six assertions
FAIL: R7: both footer strings and <footer
FAIL: R23: server log contains '[products] source: mock'
PASS: absence-only assertions (authenticated names/prices absent, no '>Member price<', no $ACTION_ID_,
      R18 no streaming markers, '<h1' x1, '<main' x1 on the scaffold) -- see below
verify-ssr: 128 passed, 134 failed
verify-ssr: FAIL
(port 3210 free and no `next start` process left after exit)
```

**Why each failure is the expected one:**

- Unit tests: `@/components/format`, `@/components/catalog-params` and `@/components/categories` do not exist yet (ui builds them), and `lucide-react` is not installed yet (R1). Every failure is module-not-found; typecheck shows only TS2307 for the same modules. To prove the tests themselves are sound, I ran them in the scratchpad against throwaway reference implementations written from the spec contract (aliased with a scratch vitest config and tsconfig, with `lucide-react@1.55.0` installed in the scratchpad, not the repo): 3 files, 54 tests passed, and `tsc --noEmit` on the three test files reported 0 errors. That run also confirmed `lucide-react@1.55.0` exports `Baby`, `Bath`, `Music`, `Puzzle`, `Rabbit`, `Shapes`, `ImageOff`, `Sparkles`. Nothing from the scratch run is in the repo.
- `verify-ssr.sh` (default mode): `next build` type-checks every `**/*.ts` in the tsconfig, including the new tests, so the build fails on the same TS2307 errors. Expected; it clears when the modules and `lucide-react` exist.
- `verify-ssr.sh` against the scaffold: every presence/count assertion fails because `/` is still the create-next-app page (no catalog, header, banner, filter card, footer or product fetch). The script started and stopped the server cleanly, minted the cookie, and fetched all 13 pages with status 200.
- The 128 passes are absence-only assertions, which a page with no catalog satisfies by definition. They cannot fail before the build. They are not vacuous after the build, because each page also carries presence assertions (every fetched page must contain `>Clear filters<` and `href="/"`, and R15/R16/R19 assert content per page), and those fail pre-build.

## Post-build

Run on 2026-10-20 from the repo root. No test or script was edited in this mode. Re-run in a second post-build pass the same day, on the current tree (last builder change: `src/components/filter-card.tsx` at 20:05). Every check was run again from scratch, and the results below are from that re-run. They are identical to the first pass.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit`: `Types generated successfully`, exit 0, no errors |
| `npm run lint` | PASS | `eslint`: no output, exit 0 |
| `npm test` | PASS | `Test Files 14 passed (14)`, `Tests 305 passed (305)`; phase 03 files alone (`src/components/`): `3 passed`, `54 passed` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected`, exit 0 |
| `npm run build` | PASS | Next.js 16.4.2 (Turbopack), exit 0, no warnings or errors (font download succeeded); `ƒ /` (dynamic), `○ /_not-found`, `ƒ Proxy (Middleware)` |
| `env SESSION_SECRET= CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN= npm run build` (R14) | PASS | exit 0, no warnings or errors; `/` is `ƒ` (server-rendered on demand, not prerendered) |
| `scripts/verify-ssr.sh` | PASS | default mode (runs its own build); `server up on http://127.0.0.1:3210`; `verify-ssr: 262 passed, 0 failed`, `verify-ssr: PASS`, exit 0; port 3210 free afterwards |
| `npm run test:e2e` | n/a (from P04) | |

| Requirement | Result |
|-------------|--------|
| R7 (verify-ssr part) | PASS (3 assertions) |
| R8 | PASS (6 tests) |
| R9 | PASS (12 tests) |
| R10 | PASS (16 tests) |
| R11 | PASS (11 tests) |
| R12 | PASS (9 tests) |
| R13 (verify-ssr part) | PASS (via R15/R16 session-dependent output and R18) |
| R14 | PASS (command) |
| R15 | PASS (48 assertions) |
| R16 | PASS (51 assertions, including name order with Set B mixed in) |
| R17 | PASS (18 assertions) |
| R18 | PASS (52 assertions, 13 pages x 4 markers) |
| R19 | PASS (a 7, b 5, c 4, d 9, e 3, f 5, g 5 assertions) |
| R20 | PASS (35 assertions) |
| R21 | PASS (10 assertions) |
| R22 | PASS (6 assertions) |
| R23 | PASS (1 assertion: `[products] source: mock` in server log) |
| R32 (command part) | PASS |
| R1-R6, R24-R31, R33, R7/R13/R32 review parts | not checked by qa (review) |

**Overall:** PASS

## Dispute

none

## Open issues

None blocking. Interpretations to confirm:

- R22: the spec says `>Search<` is "the input's label and the submit button" but gives no count. The script asserts at least 2 occurrences.
- R12: the test asserts each `CATEGORY_META` entry has exactly the keys `label`, `color`, `icon`. That follows the contract type `CategoryMeta = { label; color; icon }` and "each `{ label, color, icon }`". An extra field would fail the test.
- R10: an empty array value (`{ category: [] }`) is treated as missing (its first element is `undefined`), giving `null` / `""` / `"price"`. This follows from "first element when the value is an array" plus "never throws".
- R11: two extra cases go beyond the spec's list but follow from its rules: key order is fixed whatever the input order, and `q` is trimmed (`"  washable  "` -> `/?q=washable`).
- R18: the no-streaming assertions are absence checks and cannot fail before the build (see above).
- Post-build: no test of mine looks wrong after the run. The interpretations above all held against the build (no test needed changing).

## Where the instructions got in the way

- `agents/qa.md` pre-build step 3 says every new check must fail before the build. Absence assertions (R15/R16/R17 "contains none of", R18) cannot fail on a page that does not render the catalog yet. I paired them with per-page presence assertions instead.
- `next build` type-checks `*.test.ts` files (tsconfig `include: ["**/*.ts"]`), so pre-build `verify-ssr.sh` stops at the build step. To exercise the assertions on the scaffold, I had to move my own test files aside for one build. Neither the spec nor `agents/qa.md` mentions that a test-only TS error breaks `npm run build`.
- `agents/qa.md` Inputs says "read nothing else", but checking that the R12 icon names exist in `lucide-react@1.55.0` before ui installs it meant installing the package into the scratchpad. The spec names the icons, so this was only a soundness check.
