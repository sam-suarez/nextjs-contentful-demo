# Phase 05: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R3 | `R3: [anon\|specs\|bogus\|specs_member] the data-layout element is a <div> with class 'group', data-layout=<v>` | `scripts/verify-ssr.sh` |
| R3 | `R3: [<9 other catalog pages>] exactly one data-layout element, a <div> with class 'group'` | `scripts/verify-ssr.sh` |
| R3 | `R3: [activity\|zzz] empty state has no 'data-layout='` (plus the existing P03 `R19d` check) | `scripts/verify-ssr.sh` |
| R5 | For each of 15 catalog pages (the 13 P03 ones plus new `/?layout=bogus` and logged-in `/?layout=specs`): `R5: [name] status 200`, `R5: [name] one <a>Price first</a>, href=…, aria-current=…, no aria-pressed, no role`, the same for `Specs first`, `R5: [name] no 'aria-pressed' anywhere in the server HTML`, `R5: [name] no 'role="button"' anywhere in the server HTML` | `scripts/verify-ssr.sh` |
| R5 | All P03/P04 checks unchanged (R19 a–g `aria-current` counts, R20 hrefs) | `scripts/verify-ssr.sh` |
| R6 | `R6: [anon\|specs\|bogus\|specs_member] 'data-layout=' occurs exactly once` and `data-layout="<v>" occurs exactly once` | `scripts/verify-ssr.sh` |
| R6 | `R6: /?layout=specs logged in …` (status, all 12 names, all 12 member prices, no everyday price); `R6: /?layout=specs logged out …` (no Set B names, no member prices, all 8 everyday prices) | `scripts/verify-ssr.sh` |
| R7 | `R7: after hydration on / both options are <a> with role=button, aria-pressed and no aria-current` (also asserts no console/page error matching `/hydrat|react error #(418|423|425)/i`) | `e2e/layout-toggle.spec.ts` |
| R7 | `R7: after hydration on /?layout=specs Specs first is pressed and Price first is not` | `e2e/layout-toggle.spec.ts` |
| R8 | `R8: clicking Specs first switches the grid in place, moves the price below the <h2> and replaces the URL` (data-layout, URL `/?layout=specs`, aria-pressed, first card `Everyday price` y vs `<h2>` y, window marker survives, `history.length` unchanged, `history.replaceState` called with `/?layout=specs`, no `pushState`, no `rsc: 1` request without `next-router-prefetch`) | `e2e/layout-toggle.spec.ts` |
| R8 | `R8: clicking Price first after Specs first reverses the switch and the URL becomes /` | `e2e/layout-toggle.spec.ts` |
| R8 | `R8: clicking the already-active option changes nothing` | `e2e/layout-toggle.spec.ts` |
| R9 | `R9: on /?q=washable toggling to specs gives /?q=washable&layout=specs` | `e2e/layout-toggle.spec.ts` |
| R9 | `R9: on /?category=bath toggling to specs gives /?category=bath&layout=specs` | `e2e/layout-toggle.spec.ts` |
| R10 | `R10: after toggling to specs on /, following the Bath chip lands on /?category=bath with the price layout` (the spec's example) | `e2e/layout-toggle.spec.ts` |
| R10 | `R10: after toggling to price on /?layout=specs, following the Bath chip lands on its specs URL with the specs layout` (mirror case: server prop unchanged across the navigation, so seeded local state would be stale) | `e2e/layout-toggle.spec.ts` |
| R12 | `R12: no-JS /?layout=specs renders the specs layout with Specs first current and every price visible` | `e2e/layout-toggle.nojs.spec.ts` |
| R12 | `R12: no-JS / shows the price layout with every price visible` | `e2e/layout-toggle.nojs.spec.ts` |
| R12 | `R12: no-JS clicking Specs first on / navigates via the real link to /?layout=specs` | `e2e/layout-toggle.nojs.spec.ts` |
| R13 | `playwright.config.ts`: projects `chromium` (`testIgnore: /\.nojs\.spec\.ts$/`) and `chromium-no-js` (`javaScriptEnabled: false`, `testMatch: /\.nojs\.spec\.ts$/`), `webServer` env unchanged from P04 | `playwright.config.ts` |
| R13 | `R13: this file runs in the JS-enabled chromium project`, `R13: this file runs in the chromium-no-js project with JavaScript disabled` | both e2e files |
| R14 | Existing `R18: [name] no '<div hidden id="S:'` / `<!--$?-->` / `<template id="B:` / `Loading` loop, which now also covers the new `bogus` and `specs_member` pages | `scripts/verify-ssr.sh` |

Requirements verified only by `review`: R1 (plus `scripts/check-client-boundary.sh`), R2, R4, R11, R15. R14's `instant = false`, no `<Suspense>`/`loading.tsx` and the `ƒ` build line are also review.

**Run output (trimmed):**

```
$ npm run build   (CONTENTFUL_* blank)            -> ok, ƒ /   (current tree = P04 code)
$ VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh
verify-ssr: 551 passed, 0 failed
verify-ssr: PASS

$ npx playwright test e2e/layout-toggle.spec.ts e2e/layout-toggle.nojs.spec.ts
  ✓ [chromium]       R13: this file runs in the JS-enabled chromium project
  ✘ [chromium]       R7: after hydration on / ...                          (5.3s)
  ✘ [chromium]       R7: after hydration on /?layout=specs ...             (5.3s)
  ✘ [chromium]       R8: clicking Specs first switches the grid in place ...
  ✘ [chromium]       R8: clicking Price first after Specs first reverses ...
  ✘ [chromium]       R8: clicking the already-active option changes nothing
  ✘ [chromium]       R9: on /?q=washable ...
  ✘ [chromium]       R9: on /?category=bath ...
  ✘ [chromium]       R10: after toggling to specs on / ...
  ✘ [chromium]       R10: after toggling to price on /?layout=specs ...
  ✓ [chromium-no-js] R13: this file runs in the chromium-no-js project with JavaScript disabled
  ✓ [chromium-no-js] R12: no-JS / shows the price layout with every price visible
  ✓ [chromium-no-js] R12: no-JS /?layout=specs renders the specs layout ...
  ✓ [chromium-no-js] R12: no-JS clicking Specs first on / navigates via the real link ...
  9 failed, 5 passed
  every ✘: expect(locator).toHaveAttribute(expected) failed
    Locator: locator('a').filter({ hasText: /^\s*Price first\s*$/ })
    Expected pattern: /^(true|false)$/   (aria-pressed)
    14 × locator resolved to <a href="/" aria-current="true" class="...">Price first</a>
           - unexpected value "null"

$ npx playwright test --list   -> 17 tests in 4 files; P04 login/not-found in [chromium] only,
                                  only *.nojs.spec.ts in [chromium-no-js]
$ npm run typecheck  -> ok        $ npx eslint e2e playwright.config.ts -> clean
$ npm test           -> 305 passed  $ scripts/check-client-boundary.sh -> OK: client boundary respected
```

**Why each failure is the expected one:**

- All 9 JS-enabled failures stop at the same point: the layout options are still the P03 server links, so there is no island and no `aria-pressed` after hydration. They fail on an assertion, not because a module, locator or helper is broken.
- I checked that the JS tests are sound past that gate. I ran a scratch copy of `e2e/layout-toggle.spec.ts` (in the session scratchpad, not in the repo, now discarded) against the same P04 build. The copy injects a throwaway in-page fake island through `page.evaluate`: it calls `preventDefault`, calls `replaceState(hrefs[next])`, flips `data-layout` and `aria-pressed`, and reads the layout from `location.search`. All 10 JS tests passed with it. That shows the bounding-box, RSC-request, history-spy, marker and Bath-chip logic works against the real app, and that the tests can pass once the island is correct.
- Some checks already pass before the build, as intended. They are regression guards for "unchanged" requirements, and the P03 server markup already meets them:
  - R3/R5/R6 in verify-ssr. The server HTML stays two `<a>` links with `aria-current` and one `<div data-layout class="group">`.
  - R12 and the no-JS half of R13. No-JS behavior is the P03 links.
  - The `chromium` R13 project-name check.
- The new requirements that need the island (R7, R8, R9, R10) all fail.

## Post-build

Run once from the repo root on the current working tree (P05 build applied, tests unchanged since pre-build). `npm run build` and `scripts/verify-ssr.sh` ran with `CONTENTFUL_SPACE_ID=`, `CONTENTFUL_ENVIRONMENT=`, `CONTENTFUL_DELIVERY_TOKEN=` exported empty.

| Check | Result | Output (trimmed) |
|-------|--------|------------------|
| `npm run typecheck` | PASS | `next typegen && tsc --noEmit` -> exit 0 |
| `npm run lint` | PASS | `eslint` -> no output, exit 0 |
| `npm test` | PASS | `Test Files 14 passed (14)`, `Tests 305 passed (305)` |
| `scripts/check-client-boundary.sh` | PASS | `OK: client boundary respected` |
| `npm run build` | PASS | exit 0; route table `ƒ /`, `ƒ /login`, `○ /_not-found`, `◐ /products/[slug]` |
| `scripts/verify-ssr.sh` | PASS | `verify-ssr: 551 passed, 0 failed` / `verify-ssr: PASS`, exit 0 |
| `npm run test:e2e` | PASS (with the 1 known failure) | `16 passed, 1 failed` (17 tests, 2 projects). All 10 `[chromium]` layout-toggle tests and all 4 `[chromium-no-js]` tests pass; P04 `not-found.spec.ts` 2/2 pass. The only failure is `[chromium] e2e/login.spec.ts` R17, the known OI-1 failure (see below). |

Known failure (not gating, per spec "Known failure"): `e2e/login.spec.ts:23` R17. `toHaveURL(/products/...)` passes, then `getByText('Member price', { exact: true })` resolves to 13 elements, so the page shows the catalog content under the detail URL. This matches OI-1 ("login return replays client redirect") as recorded at P04. I did not change the test.

| Requirement | Result |
|-------------|--------|
| R1 | PASS (command part: `check-client-boundary.sh` -> `OK: client boundary respected`); the file/exports part is review |
| R2 | review (not verified by qa) |
| R3 | PASS (verify-ssr: one `<div class="group" data-layout>` per non-empty page, none on the empty-state pages); the component structure part is review |
| R4 | review (not verified by qa) |
| R5 | PASS (verify-ssr: 15 pages, two `<a>` with the expected hrefs/`aria-current`, no `aria-pressed`, no `role="button"`; P03 R19/R20 checks unchanged and passing) |
| R6 | PASS (verify-ssr: exactly one `data-layout=` with the expected value on `/`, `/?layout=specs`, `/?layout=bogus`, logged-in `/?layout=specs`; Set B / member-price checks pass) |
| R7 | PASS (e2e: both R7 tests, no hydration console/page errors) |
| R8 | PASS (e2e: all three R8 tests) |
| R9 | PASS (e2e: both R9 tests) |
| R10 | PASS (e2e: both R10 tests) |
| R11 | review (not verified by qa) |
| R12 | PASS (e2e no-JS: all three R12 tests) |
| R13 | PASS (`npm run test:e2e` runs `chromium` and `chromium-no-js`; both R13 project checks pass; P04 files run in `chromium` only) |
| R14 | PASS (verify-ssr R18 streaming/fallback checks on every catalog page; build shows `ƒ /`); no-`<Suspense>`/`loading.tsx`/`instant = false` is review |
| R15 | review (not verified by qa) |

**Overall:** PASS (every check passes; the single e2e failure is the spec's non-gating known failure R17 / OI-1)

## Dispute

none

## Open issues

- The R8 "no document load" check uses a window marker. The "no refetch" check uses requests with header `rsc: 1` and without `next-router-prefetch`, read via `request.allHeaders()`. If ui renders the options with `next/link`, Next may fire prefetch requests; those are excluded on purpose.
- The R8 history check wraps `history.replaceState`/`pushState` in an init script, before Next patches them. Next's own internal `replaceState` calls also land in the spy, so the check is "some call had `hrefs.specs`" plus "`history.length` unchanged" plus "no `pushState` after the click". It is not an exact call count.
- R7's hydration-mismatch check listens until `networkidle` for console errors and page errors matching `/hydrat|react error #(418|423|425)/i`. That covers both the readable and the minified production React hydration errors. A mismatch React recovers from without logging one of these would go unnoticed, so the reviewer should also confirm the post-mount switch (spec R7, "after mount") in code.
- verify-ssr's existing P04 R2 section (two `page` assignments, no checks) has no assertions. That is outside this phase's scope, and I left it untouched.

- Post-build: no test of mine looks wrong. Note that `npm run test:e2e` itself exits non-zero while OI-1 is open, because the known R17 failure is in the same run. The PASS above relies on the spec's "only e2e/login.spec.ts may fail" rule, not on the command's exit code.

## Where the instructions got in the way

- R5 says "for every catalog URL". I read that as every catalog URL that `verify-ssr.sh` fetches, plus the two new ones R6 names. Without an explicit list, the empty-state pages (`/?category=activity-sensory`, `/?q=zzz`) were ambiguous: does the toggle render there at all? I confirmed from the P03 server HTML (curl against the current build) that it does, and included them.
- R6 says "still all Set B / member-price checks as in P03". I reused the P03 R15/R16 assertion set (names present or absent, member prices present or absent, everyday prices absent or present) and added no new counts.
