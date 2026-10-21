# Verify the batch run

One checklist for everything deferred in the two batch-run threads: human checks for phases 04, 05, 06, 04-fix1, 07 and 08, a read-through of the Step A doc edits, and the decisions still open. The expected numbers below are current as of phase 08 (`a2da463`). Several older `human-check.md` files quote earlier numbers or no-JS steps that D-031 later dropped. Where they differ, this file wins.

Budget: about 45 minutes. Tick each box as you go.

## 0. Setup

- [ ] In the repo root, export `CONTENTFUL_SPACE_ID= CONTENTFUL_ENVIRONMENT= CONTENTFUL_DELIVERY_TOKEN=` (empty, so the mock data is used) and a `SESSION_SECRET` of 32+ characters.
- [ ] Stop any `next dev` you have running on port 3000.

## 1. Automated checks (covers 06 and 08, re-confirms 04, 05, 04-fix1, 07)

- [ ] `rm -rf .next && npm run build; echo "exit=$?"`: `exit=0`, no warnings, and `/`, `/login`, `/products/[slug]` all marked `◐` (Partial Prerender). Phase 04/05/06 said `ƒ` for `/` and `/login`; `◐` is correct since phase 07.
- [ ] `npm run typecheck && npm run lint && npm test && scripts/check-client-boundary.sh`: all pass, `390 passed` in 15 files, `OK: client boundary respected`.
- [ ] `VERIFY_SSR_SKIP_BUILD=1 scripts/verify-ssr.sh`: `474 passed, 0 failed`. Phase 05/06 said 551 and 04-fix1 said 610; phase 07 removed only the streaming/no-JS checks that D-031 dropped.
- [ ] `npm run test:e2e`: `25 passed`, one Playwright project (`chromium`). Phase 04/05/06 expected the R17 failure; it is fixed now (OI-1 closed by 04-fix1).
- [ ] `npx playwright test e2e/layout-shift.spec.ts --repeat-each=3`: `36 passed`.

## 2. In the browser (`npm start`, then http://localhost:3000)

### Phase 04: product detail and login

- [ ] Logged out, `/products/cloud-bunny-plush`: breadcrumb, heading "Cloud Bunny Plush", "Everyday price" $28.00, and a "Sign in for member pricing" button that goes to `/login?next=/products/cloud-bunny-plush`.
- [ ] `/products/no-such-toy`: the "404" pill, "We can't find that toy", and a "Back to catalog" button. (The HTTP status is 200 with `noindex`, which was accepted.)
- [ ] `/login`, submit both fields empty: you land on `?error=missing` with the alert, and `next` is kept if it was in the URL.

### Phase 04-fix1: members-only redirect (closes OI-1)

- [ ] `curl -sI http://localhost:3000/products/forest-friends-activity-cube`: `307` with `location: /login?next=%2Fproducts%2Fforest-friends-activity-cube`.
- [ ] `curl -sI http://localhost:3000/products/cloud-bunny-plush`: `200`, no `location`.
- [ ] Logged out, open `/products/forest-friends-activity-cube`: you land on sign-in. Sign in with any name: you land **on that product** with "Member price" $71.20 and the "Members only" badge. This used to be the OI-1 bug.
- [ ] Sign out: you are on `/` with "Sign in" in the header and nothing members-only visible. Optional, for OI-2: DevTools → Elements, search "Forest Friends". It is still in the hidden DOM until you reload.
- [ ] Quick read of `src/proxy.ts` and `src/lib/products/members-only.ts`: the proxy only redirects, and the page still asks the DAL.

### Phase 05: layout toggle

- [ ] On `/`, click **Specs first**: the cards become horizontal spec rows with the price last, the URL becomes `/?layout=specs`, and the page doesn't reload (no document request in the Network tab). Back does not step through layouts. **Price first** returns to `/`.
- [ ] On `/?q=washable`, toggle: the URL becomes `/?q=washable&layout=specs`.
- [ ] Known limit (accepted 2026-10-20): toggle to Specs first, then click the **Bath** chip. You get `/?category=bath` in Price first.
- [ ] Keyboard: Tab to the layout options. The focus ring is visible and Enter toggles. Space doesn't, because the options are `<a role="button">`.
- [ ] View source of `/?layout=specs`: one `data-layout="specs"`, and "Specs first" has `aria-current="true"`. The old no-JS step from phase 05 (toggle with JavaScript off) no longer applies: since D-031, a visitor without JS sees the catalog skeleton.

### Phase 07: suspense skeletons

- [ ] DevTools Network → "Slow 4G", open `/`: grey pulsing blocks in the header's session area, the banner and the catalog, then the real content appears in the same place with nothing jumping. Repeat on `/products/cloud-bunny-plush` and `/login`, logged out and signed in.
- [ ] Same with the device toolbar at 375 px wide.
- [ ] DevTools Rendering → "prefers-reduced-motion: reduce": the blocks stop pulsing.
- [ ] View source of `/` logged out: "Everyday price" present, "Member price" absent. Signed in: "Member price" present, "Everyday price" absent. The prices are in the HTML even though they stream in after the skeleton.

### Phase 08: release check

- [ ] Everything in section 1 passed. Section 1's first box covers the one gap qa left (its build exit code wasn't captured).
- [ ] Optional, needs credentials: put real `CONTENTFUL_*` values in `.env.local`, then `npm run build && npm start`. The server log names the live source, the catalog shows the live products with images from `images.ctfassets.net`, and the skeleton swap doesn't visibly jump. Sizes were tuned to the mock data.

### Phase 06

- [ ] Nothing extra: phase 08 re-ran every phase 06 check on the newer code (section 1).

## 3. Read-through of the Step A doc edits (commit `8a147c9`)

`git show 8a147c9`, about 50 changed lines:

- [ ] **Decision numbering.** Your prompt called the two new decisions D-030 and D-031. `docs/decisions.md` already had a D-030 (AGENTS.md vs AGENT.md, cited in `docs/progress.md:47`), and rows may not be deleted. So **Suspense skeletons became D-031** and **the proxy redirect became D-032**. Every later file uses D-031/D-032. If you'd rather keep your numbering, the old D-030 has to be renumbered by hand in `docs/decisions.md` and `docs/progress.md`.
- [ ] `docs/decisions.md`: D-031 (Suspense with layout-matched skeletons, `instant = false` removed, no-JS checks dropped for streamed content) and D-032 (proxy 307 for logged-out members-only slugs). D-020 is marked superseded; D-009 and D-019 partly.
- [ ] `docs/architecture.md`: Routes, Server/client boundary, Auth (proxy matcher adds `/products/:slug`) and Tests (both directions on the response body, 307 + Location, CLS < 0.01) read the way you meant.
- [ ] `docs/design.md`: the new Skeleton component entry; the `instant = false` reference is gone.
- [ ] `agents/{ui,qa,orchestrator,reviewer}.md` and `.claude/rules/ssr-rendering.md`: the old "use `instant = false`, never `<Suspense>`" rules are replaced by D-031/D-032.

## 4. Decisions you need to make

### OI-2: after sign-out, the previous members-only page is still hidden in the DOM

After you sign out, the members-only product page you just left (its name and member price) stays in the tab's DOM, hidden, until the next full page load. Nothing new is sent to a logged-out visitor. It is a leftover of what that user already saw while signed in. Details are in `handoffs/OPEN-ISSUES.md`.

- [ ] Pick one: **(1) accept it** (nothing to build), **(2) a full page load on sign-out**, which needs an architecture decision on the logout flow (data-auth, or a small client island), or **(3) refresh the router cache on sign-out**. Option 3 is untested: it may not clear the hidden page.

### Phase 07 visible layout changes (the builder made them so the skeletons match with no layout shift)

Accept or reject each. A rejection becomes a ui fix phase, which may bring a little layout shift back.

- [ ] **Header below `md`:** the session controls always sit on their own full-width row (48 px) under the logo. Logged out, "Sign in" drops below the logo. Logged in, the "Member pricing" badge sits above the "Signed in as …" name, and long names are cut off.
- [ ] **Banner:** the text box keeps a minimum height, so the logged-out and logged-in banners are the same size. Below about 360 px it reserves three lines.
- [ ] **Login page demo note:** keeps a fixed minimum height.
- [ ] **Detail price card, logged out:** the "Sign in for member pricing" prompt and button are always stacked, not side by side as in the design.md mock.
- [ ] **Detail price card, logged in:** members get an empty area of about 80 px under the price, where visitors see the sign-in row. design.md says members get "no sign-in row".

## Report back

In a fresh session: `/phase PASSED` if everything holds and you accept the defaults, or `/phase FAILED: <phase>: <what you saw>; OI-2 = <1|2|3>; layout = <accept all | reject: …>`.
