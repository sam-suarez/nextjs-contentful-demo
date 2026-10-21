# Phase 07: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R4 | `R10: <path> <state> at <viewport>: skeletons replaced, CLS below 0.01, real content visible` (all 12): soft assertion that `data-skeleton="header-session"` entered the DOM during load with `aria-busy="true"` | `e2e/layout-shift.spec.ts` |
| R5 | e2e: same tests for `/` and `/?category=bath` assert `data-skeleton="banner"` and `data-skeleton="catalog"` were shown and replaced, CLS < 0.01, `h1` "Toy catalog" and price label visible. verify-ssr: existing catalog checks kept (P03 R15, R16, R17, R19a-g, R20, R21, R22, R7 footer; P05 layout checks) | `e2e/layout-shift.spec.ts`, `scripts/verify-ssr.sh` |
| R6 | e2e: same tests for `/products/cloud-bunny-plush` assert `data-skeleton="product-detail"` shown and replaced, CLS < 0.01, `h1` "Cloud Bunny Plush" and price label visible. verify-ssr: existing P04 detail checks (R3-R11) and P04-fix1 307 checks kept | `e2e/layout-shift.spec.ts`, `scripts/verify-ssr.sh` |
| R7 | verify-ssr: existing P04 login checks kept (R12-R15: `>Sign in<` exactly twice, `<h1>Sign in</h1>`, form, `$ACTION_ID_`, inputs, hidden `next` round trip, error alert, "Continue browsing" link, logged-in 307 to `/`) | `scripts/verify-ssr.sh` |
| R8 | Every R10 test runs at 1280x720 (Desktop Chrome default) and at 375 px width (375x812) and requires CLS < 0.01 while the skeletons are replaced | `e2e/layout-shift.spec.ts` |
| R10 | 12 tests: {`/`, `/?category=bath`, `/products/cloud-bunny-plush`} x {logged out, logged in} x {1280x720, 375 px}. Init script installed before navigation: `PerformanceObserver` on `layout-shift` with `buffered: true`, entries with `hadRecentInput` skipped, values summed; `MutationObserver` records every `[data-skeleton]` root added to the DOM and its `aria-busy`. After load: page `h1` / product name visible, price label ("Everyday price" logged out, "Member price" logged in) visible, zero visible `[aria-busy="true"]`, expected skeletons were shown with `aria-busy="true"`, CLS < 0.01. Logged in = `session` cookie minted with jose and `webServer.env.SESSION_SECRET` read from `playwright.config.ts` | `e2e/layout-shift.spec.ts` |
| R11 | verify-ssr: existing both-direction checks kept on the whole body (P03 R15/R16/R17, R19c/d, P04 R4/R5/R6 detail prices and Set B, R3/R10 307 bodies). Streamed content counts as present (no wrapper or fallback assertions remain) | `scripts/verify-ssr.sh` |
| R12 | Removed, and only these: the verify-ssr R18 loop (its four assertions: `<div hidden id="S:`, `<!--$?-->`, `<template id="B:`, `Loading`; the loop had no other checks); the `chromium-no-js` project (and the now-unneeded `testIgnore: /\.nojs\.spec\.ts$/` on `chromium`) in `playwright.config.ts`; `e2e/layout-toggle.nojs.spec.ts` deleted. Comments that referred to them updated. Every other check is untouched | `scripts/verify-ssr.sh`, `playwright.config.ts`, `e2e/layout-toggle.nojs.spec.ts` (deleted) |
| R13 | Whole existing suites kept: `npm test`, the rest of `scripts/verify-ssr.sh`, JS-enabled e2e (`layout-toggle.spec.ts` incl. its "runs in the chromium project" check, `login.spec.ts`, `not-found.spec.ts`) | as listed |

Requirements verified only by `review` / command (no qa check written): R1 (command `grep` / `find` from the spec's Checks, plus review), R2, R3, R9 (`scripts/check-client-boundary.sh` plus review), R14. R4, R5, R6, R8 also have a review part.

**Run output (trimmed):**

```
$ npx tsc --noEmit -p .            # clean
$ npx eslint e2e/layout-shift.spec.ts playwright.config.ts
lint-ok

$ scripts/verify-ssr.sh             # builds with CONTENTFUL_* blank, own SESSION_SECRET
INFO: npm run build (CONTENTFUL_* blank, own SESSION_SECRET)
INFO: server up on http://127.0.0.1:3210
verify-ssr: 474 passed, 0 failed
verify-ssr: PASS

$ npx playwright test               # against that build
  ✘  R10: / logged out at 1280x720: skeletons replaced, CLS below 0.01, real content visible
  ✘  R10: / logged in at 1280x720: ...
  ✘  R10: /?category=bath logged out at 1280x720: ...
  ✘  R10: /?category=bath logged in at 1280x720: ...
  ✘  R10: /products/cloud-bunny-plush logged out at 1280x720: ...
  ✘  R10: /products/cloud-bunny-plush logged in at 1280x720: ...
  ✘  (the same six at 375 px)
    Error: skeleton data-skeleton="header-session" shown during load with aria-busy="true"
    Expected: "true"
    Received: undefined
    (likewise "banner" and "catalog" on / and /?category=bath, "product-detail" on the detail page)
  ✓  layout-toggle.spec.ts: R13, R7 x2, R8 x3, R9 x2, R10 x2
  ✓  not-found.spec.ts: R2/R16 x2
  ✓  login.spec.ts: R12 (P04 R17)
  12 failed
  13 passed (9.1s)
```

Probe sanity check (scratch only, not part of the suite): the same init-script code against a synthetic streamed page that swaps a `data-skeleton` fallback for content after 600 ms recorded `{"skeletons":{"catalog":"true"}}` in both cases and CLS `0` when the skeleton matched the content height, `0.065` (one shift) when it did not. So the test can see both skeletons and shifts; it is not broken.

**Why each failure is the expected one:** every R10 test fails only on the skeleton assertions: `src/components/skeletons.tsx` does not exist yet and the pages have no Suspense boundaries, so no `data-skeleton` root ever enters the DOM (`Received: undefined`). All other assertions in those tests (h1 and price label visible, no visible `aria-busy`, CLS < 0.01) pass pre-build, as they should: today's pages render without any skeleton swap, so they show no shift. That is why the skeleton check is there: without it, the CLS check would pass on a page that never went through skeletons. The 13 passing e2e tests and the 474 verify-ssr checks are the existing regression checks R11/R13 require to keep holding; they pass before the build by design.

## Post-build

Locked tests verified first: `shasum -a 256 -c handoffs/phase-07/tests.sha` reports `OK` for all 21 files in `tests.list`. No test was edited in this mode.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit`: `✓ Types generated successfully`, exit 0, no errors |
| `npm run lint` | PASS | `eslint`: no output, exit 0 |
| `npm test` | PASS | `Test Files 15 passed (15)`, `Tests 390 passed (390)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | `✓ Compiled successfully`; routes `◐ /`, `○ /_not-found`, `◐ /login`, `◐ /products/[slug]` (Partial Prerender); exit 0 |
| `scripts/verify-ssr.sh` | PASS | own build (CONTENTFUL_* blank, own SESSION_SECRET), server on :3210; `verify-ssr: 474 passed, 0 failed`, `verify-ssr: PASS` |
| `npm run test:e2e` | PASS | `Running 25 tests using 4 workers` ... `25 passed (9.0s)`: 12 x R10 layout-shift, 10 x layout-toggle, 2 x not-found, 1 x login. Retries are 0 outside CI, so no test passed on a retry; none reported flaky |
| R1 command: `grep -rn "export const instant" src ; find src/app -name 'loading.tsx'` | PASS | both empty |

Extra stability run (not in the Checks list, for information only): `npx playwright test --repeat-each=3 e2e/layout-shift.spec.ts`: `36 passed (14.2s)`. The CLS tests passed every time, with no intermittent failures.

| Requirement | Result |
|-------------|--------|
| R1 | PASS (command: no `export const instant` under `src/`, no `loading.tsx` under `src/app`). Review part is for the reviewer |
| R2 | Not checked by qa (review only) |
| R3 | Not checked by qa (review only) |
| R4 | PASS (e2e: `header-session` skeleton was shown with `aria-busy="true"` and then replaced in all 12 R10 tests). Review part is for the reviewer |
| R5 | PASS (e2e: `banner` and `catalog` skeletons were shown and replaced on `/` and `/?category=bath`, CLS < 0.01; verify-ssr catalog checks pass). Review part is for the reviewer |
| R6 | PASS (e2e: `product-detail` skeleton was shown and replaced, CLS < 0.01; verify-ssr P04 detail and P04-fix1 307 checks pass). Review part is for the reviewer |
| R7 | PASS (verify-ssr P04 login checks pass: `>Sign in<` exactly twice, form, hidden `next`, alert, logged-in 307). Review part is for the reviewer |
| R8 | PASS (e2e: CLS < 0.01 at 1280x720 and 375x812 for every path and state). Review part is for the reviewer |
| R9 | PASS (`scripts/check-client-boundary.sh`). Review part is for the reviewer |
| R10 | PASS (12/12, plus 36/36 on the repeat run) |
| R11 | PASS (verify-ssr both-direction checks on the whole body, 474/474) |
| R12 | Review (qa diff). For the record: `scripts/verify-ssr.sh` and `playwright.config.ts` now mention the removed checks only in comments, and `e2e/layout-toggle.nojs.spec.ts` is deleted. The diff is the pre-build one, and the checksums are unchanged |
| R13 | PASS (unit 390/390, verify-ssr 474/474, JS-enabled e2e layout-toggle/login/not-found 13/13) |
| R14 | Not checked by qa (review only) |

**Overall:** PASS (all 7 checks plus the R1 command pass. R2, R3, R12 and R14, and the review parts of R1 and R4 to R9, are left to the reviewer)

## Dispute

**Disputed test:** `R7: breadcrumb reads Catalog, Plush, product name in order` (`scripts/verify-ssr.sh`, P04 R7, kept by P07 R13). Raised in `build.md` Open issues.

**Decision: the test is wrong. Fixed.**

**Reason:**
- `in_order` takes the first occurrence of each needle anywhere in the body. The third needle was bare text (`Cloud Bunny Plush`), while the first two are anchored to element text (`>Catalog<`, `>Plush<`).
- P07 R6 requires the breadcrumb to be inside the detail Suspense boundary. P07 R11 and architecture.md Tests (D-031) say streamed content counts as present because it is in the same response. Where Next puts the boundary's RSC flight data relative to its HTML is not part of the spec. That flight data carries the bare name (`"children":"Cloud Bunny Plush"`) before the breadcrumb markup.
- So with a correct build, the bare needle matches inside a `<script>`, not in the breadcrumb. The check was then testing where Next places flight data, not breadcrumb order. That conflicts with R6/R11, which the spec requires to hold together with R13.
- The intent of P04 R7 is the order of the rendered breadcrumb text. Anchoring the third needle as `>Cloud Bunny Plush<` checks exactly that, using the convention the other two needles and the R22 chip-order check already use. This is not a weaker test: it still fails if the product name's element text comes before `>Catalog<` or `>Plush<`, or is missing. The separate "plain text, not a link" check (`lacks ">Cloud Bunny Plush</a>"`) is unchanged.

**Change:** one needle, `"Cloud Bunny Plush"` → `">Cloud Bunny Plush<"`, plus a two-line comment explaining why. No other check touched.

**Verification:**
- `scripts/verify-ssr.sh` against the current build: `verify-ssr: 474 passed, 0 failed`, `verify-ssr: PASS`, including `PASS: R7: breadcrumb reads Catalog, Plush, product name in order`.
- Synthetic HTML, scratch only, using the script's own `order.mjs`. Flight script first, then the breadcrumb in the correct order: new needles pass (0) and the old bare needle fails (1). Product-name element placed before Catalog/Plush: new needles fail (1). So the fixed check still catches a wrong order.

## Open issues

- **No new failing verify-ssr check for R5, R6, R7, R11.** Their verify-ssr part is "existing checks still hold", and the only HTML that Suspense adds is the fallback and the streaming wrappers, which D-031 and agents/qa.md say not to assert on. So the verify-ssr coverage for these is regression checks that pass before and after the build. The D-025 "fails before the build" part for the Suspense placement is the e2e skeleton check (R4, R5, R6) plus review.
- **The e2e skeleton check assumes the fallback reaches the DOM.** It relies on each boundary's fallback being in the HTML the browser parses (the prerendered shell with Cache Components on), which then gets swapped. If a boundary's fallback is correctly wired but never reaches the DOM after the build (content inlined before the shell is flushed), that check would fail even though R4 to R6 hold. I don't expect this for boundaries that read cookies / `searchParams`, but if it happens post-build I will report it here rather than change the test.
- **Post-build update on the fallback-in-DOM assumption:** it held. Every boundary's skeleton reached the DOM and was replaced in all 12 R10 tests, and in all 36 on the repeat run. I don't think any of my tests are wrong post-build.
- **375 px viewport height:** the spec gives only the width; the tests use 375x812.
- **R12 removals:** done (the file was deleted with `git rm`, then unstaged so the deletion shows as an unstaged change like the others). The permission system did not deny anything.

## Where the instructions got in the way

- D-025 ("fails before the build") conflicts with how R10 is worded: on today's pages, which have no boundaries, the CLS total is already below 0.01, so a CLS-only test passes before the build. The phrase "while ... its skeletons are replaced" is what justifies the skeleton-presence assertion that makes the test fail before the build. It would be clearer if the spec said so directly.
- agents/qa.md Paths does not list `handoffs/phase-NN/qa.md` under "Owns", but Output says to write it.
