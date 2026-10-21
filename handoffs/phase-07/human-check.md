# Phase 07: Human check

**Status:** closed (commit: see `git log --grep "phase 07"`)
**Result:** PASSED (2026-10-21, via `handoffs/VERIFY.md`; the report named only 04-fix1 as failed). Layout changes: **accept all** (header row below `md`, banner and login-note min heights, stacked sign-in row, 80 px member row)

## Escalation

None. Two rounds used: round 1 REVISE (R3 skeleton radius, R8 sizes), round 2 all PASS. qa-run post-build PASS in round 2.

## Visible layout changes to sign off

The builder made these so the skeletons could match the real content with no layout shift. The spec said "changing layout" was out of scope, so they need your decision. If you reject one, it becomes a ui fix phase.

1. **Header below `md` (phones and small tablets):** the session controls always sit on their own full-width row (48 px) under the logo. Logged out, the "Sign in" button drops below the logo. Logged in, the "Member pricing" badge sits above the "Signed in as …" name, and long names are cut off with "…".
2. **Banner:** the banner text box keeps a minimum height, so the logged-out and logged-in banners are the same height. Below about 360 px it reserves three lines.
3. **Login page demo note:** the note under the form keeps a fixed minimum height.
4. **Product detail price card, logged out:** the "Sign in for member pricing" prompt and button are always stacked (text above the button). Before, they sat side by side when the card was wide enough. design.md's mock shows them side by side.
5. **Product detail price card, logged in:** members get an empty area about 80 px tall (about 92 px including the gap) under the price, where visitors see the sign-in row. design.md says members get "no sign-in row".

Known limits, also from the reviewer and builder (no action unless you want one):

- Skeleton sizes are tuned to the mock data and fonts. Other products, live Contentful copy, `/?layout=specs`, `/login?error=missing` (alert adds 64 px) and empty results can still shift a little. Only `cloud-bunny-plush` is measured.
- Skeleton chip widths are hard-coded in px (`src/components/skeletons.tsx`); re-measure if chip labels or fonts change.
- Unknown slugs (`/products/no-such-toy`) answer HTTP 200 with `noindex` and show the not-found page. That was already accepted as JS-handled.

## Verify it yourself (about 10 minutes)

Run from the repo root, with `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` exported and a 32+ char `SESSION_SECRET`.

1. `rm -rf .next && npm run build`. Expect: exit 0; `◐ /`, `◐ /login`, `◐ /products/[slug]`.
2. `grep -rn "export const instant" src; find src -name loading.tsx`. Expect: no output.
3. `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh`. Expect: `474 passed, 0 failed`.
4. `npm run test:e2e`. Expect: `25 passed`.
5. `npm start`, then in Chrome DevTools set network throttling to "Slow 4G" and open `http://localhost:3000/`. Expect: grey pulsing blocks in the header's session area, the banner and the catalog, then the real content in the same place with nothing jumping. Repeat on `/products/cloud-bunny-plush` and `/login`.
6. Same, with the device toolbar at 375 px wide, logged out and then signed in. Look at items 1 to 5 above and decide whether each is acceptable.
7. View source on `/` while logged out (`view-source:http://localhost:3000/`): search `Everyday price` (present) and `Member price` (absent). Signed in: `Member price` present, `Everyday price` absent. The prices are in the source even though they stream in after the skeleton.
8. Turn on "Emulate CSS prefers-reduced-motion: reduce" in DevTools Rendering. Expect: the skeleton blocks don't pulse.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>`, for example `/phase PASSED`, `/phase FAILED: <what you saw>` or `/phase FIXED MANUALLY: <what you changed>, <sha>`. `/phase` is the only entry point: it turns on the orchestrator's path guard (D-029, D-033).
