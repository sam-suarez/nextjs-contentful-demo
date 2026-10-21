# Open issues

Escalations from the batch run (phases 04 → 05 → 06, one thread; D-026 suspended by the human for that thread). Owned by the orchestrator. Each entry names the decision the human needs to make.

## OI-1 · Phase 04 · R17 (and R3 by extension): signing in from a members-only redirect lands on `/`, not the product

**Status:** **CLOSED** by `phase-04-fix1` (resume thread, 2026-10-20). `src/proxy.ts` now answers a logged-out Set B slug with a real 307 to `/login?next=/products/<slug>` (D-032); verify-ssr 610/610 (R3 307 + Location restored), e2e 17/17 (R17 passes, URL check anchored to the pathname). Decided 2026-10-20: option 1 (proxy redirect for Set B slugs). Was: escalated after 3 of 3 build rounds; phase 04 committed as `wip(detail): … (escalated: …)`.

**Related human decision (same day):** remove `instant = false` everywhere and adopt `<Suspense>` with layout-matched skeletons (no layout shift); drop "works without JS" for streamed content but keep proving prices are in the initial HTML response (assessment Part 1 item 3). Recorded as **D-031** in `docs/decisions.md` (D-030 was already taken; the proxy decision is D-032). Past commits stay as they are.

**Requirement IDs:** R17 (e2e login → back to product). Related: R3 (server 307, dropped in spec Amendments round 3), R1.

**Symptom.** A logged-out visitor opens `/products/forest-friends-activity-cube`. The client redirects them to `/login?next=/products/forest-friends-activity-cube`. They sign in, the URL briefly becomes the product page, and then the browser ends on `/` showing the catalog. Opening the product URL directly with the same cookie works. After a direct login, clicking the card works. Only the "redirected to login, then back" path breaks, and it keeps breaking in that tab until a full reload.

**Evidence.**
- `npm run test:e2e`: 1 failed / 2 passed. `e2e/login.spec.ts:23` fails because 13 "Member price" elements are on the page (the catalog grid) where the detail page was expected. `e2e/not-found.spec.ts` passes 2/2.
- All other checks pass: typecheck, lint, `npm test` 305/305, client boundary, `npm run build` (`/products/[slug]` still `◐`, accepted in round 3), `scripts/verify-ssr.sh` 380/380 (`handoffs/phase-04/qa.md` "Post-build, round 3").
- Network trace (qa): the login action returns `x-action-redirect: /products/forest-friends-activity-cube;push`. The browser then refetches `/login?next=…&_rsc=…`, and `src/proxy.ts` (session present on `/login`) answers `307 → /`.
- Cause (ui, from `node_modules/next/dist/client/components/layout-router.js` and `redirect-boundary.js`; see `handoffs/phase-04/build.md` "Open issues"): with `cacheComponents`, the old route subtree stays in a hidden `<Activity>` keyed by URL segment. The logged-out render's `RedirectBoundary` state lives in that entry. Pushing back to the same URL re-shows the entry, and it replays the redirect to `/login`.
- Root cause upstream: `/products/[slug]` builds `◐`, so `redirect()` / `notFound()` run in the client, not as a server 307/404 (phase 04 rounds 1–2; human accepted this in Amendments round 3).

**What was tried.** Round 1: `instant = false` only. Round 2: `await connection()` first (no effect, still `◐`). Round 3: no source change; ui showed that no lever inside its paths and the amended spec changes the Activity key (a `[slug]` layout or `template.tsx` keeps the same key). Ruled out by the spec, the amendments or `agents/ui.md`: `<Suspense>`, `loading.tsx`, `'use client'` outside `src/components/client/`, `generateStaticParams`, proxy changes.

**Secondary (test defect, non-gating):** `e2e/login.spec.ts:22` `toHaveURL(new RegExp(\`${DETAIL_PATH}$\`))` has no start anchor, so it also matches `/login?next=/products/…`. Lines 23–25 still catch the failure. qa suggests anchoring it to the pathname in the next dispute round.

**Decision needed (pick one):**
1. **Proxy redirect for Set B slugs** (data-auth, `src/proxy.ts`): a logged-out request for a members-only slug gets a server 307 to `/login?next=…` before rendering. This also brings back R3's real 307. It reverses round 3's "no proxy change", and the proxy needs to know which slugs are Set B (a data lookup in the proxy, or a slug list). Architecture decision.
2. **Hard navigation after login** (data-auth + ui): `login` returns the safe `next` path instead of calling `redirect()`, and a client island under `src/components/client/` does `window.location.assign(next)`. Changes the P01 `login` contract and adds a client island to `/login`.
3. **`generateStaticParams` for `/products/[slug]`** (ui): may make the route `ƒ`/prerendered so the branches run on the server. Untested, and currently ruled out by round 3.
4. **Accept the bug** and drop or rewrite R17 (qa), documenting that a visitor must reload after signing in from a members-only redirect.

Whichever you pick, `docs/architecture.md` (Server/client boundary, "`instant = false` … render fully on the server") and `agents/ui.md` are inaccurate for this route and need a human edit (no agent may edit them).

**Effect on later phases.** Phase 05 (layout toggle on `/`) does not depend on this route, so it runs; R17 is excluded from its gating checks. Phase 06 (release check) re-runs the full e2e suite: R17 will fail there and is recorded under this issue instead of opening a fix phase, because its owner depends on the decision above.

**Phase 06 (release check) confirmation:** clean build + every check run. R17 is the only failing check (`[chromium] e2e/login.spec.ts:8`, fails at `:23`, 13 "Member price" matches = catalog at `/`). No fix phase opened, because the owner depends on the decision above.

## OI-2 · Phase 04-fix1 · R12 (P04 R17): after sign-out, the previous Set B page stays hidden in the browser's DOM

**Status:** **CLOSED** by `phase-04-fix2` (2026-10-21): sign-out is a native POST to `/logout` answered with 303, so the browser does a full page load; e2e checks the whole DOM with no reload. Decided 2026-10-21: **option 2** (human check of 04-fix1 FAILED on this). Sign out posts to a `POST /logout` route handler that answers 303 to `/` (full page load); the logout server action is removed (D-034). `phase-04-fix2` escalated before spec: D-034 is not yet in `docs/decisions.md` and `docs/architecture.md:17,64` still say logout is a server action (`handoffs/phase-04-fix2/human-check.md`). Was: open, non-blocking. Found by data-auth and qa; confirmed by the reviewer's notes.

**Requirement IDs:** phase-04-fix1 R12 (P04 R17). Related: D-031, assessment "Set B never reaches logged-out visitors".

**Symptom.** Sign in, open a members-only product, click Sign out. You land on `/`, logged out, and nothing members-only is visible. But the product page you just left (name, member price) is still in the page's DOM, hidden with `display: none`, until the next full page load. Anyone using the same tab could find it with DevTools.

**Evidence.** `handoffs/phase-04-fix1/build.md` "Open issues"; `handoffs/phase-04-fix1/qa.md` "Dispute" (probe: after sign-out, "Signed in as" 1 match in the DOM, 0 visible; product name 2 in the DOM, 0 visible; 0 after reload; session cookie gone). Cause: with `cacheComponents` on, Next keeps the previous route mounted in a hidden `<Activity>` (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md` "Navigation with Activity"; `.../02-guides/preserving-ui-state.md` "Testing"). No new server response contains Set B data when logged out (verify-ssr passes).

**What was done.** qa made the post-sign-out e2e checks count only visible elements, and added a whole-DOM check after `page.reload()` plus a check that the `session` cookie is gone (dispute decision; no assertion on server output was weakened).

**Decision needed (pick one):**
1. **Accept it** (it's a client-side cache of what the user already saw while signed in; nothing new leaks). Nothing to build.
2. **Hard navigation on sign-out**: logout ends with a full page load so the old DOM is dropped. Needs an architecture decision (the logout action, data-auth, would stop using a client-side redirect, or a small client island does `window.location.assign("/")`).
3. **Refresh the router cache on sign-out** (e.g. `refresh()` from the logout action). Untested whether it drops hidden `<Activity>` entries.

## Note · Decision IDs renumbered (Step A)

**Status:** CLOSED 2026-10-21: the human keeps D-031/D-032.

The prompt named the new decisions D-030 and D-031, but `docs/decisions.md` already had a D-030 (AGENTS.md vs AGENT.md, cited in `docs/progress.md:47`), and rows may not be deleted. The orchestrator used **D-031** (Suspense skeletons) and **D-032** (proxy redirect). If you'd rather keep your numbering, the old D-030 row has to be renumbered instead (a human edit to `docs/decisions.md` and `docs/progress.md`).

## Non-blocking notes for the human (not escalations)

- **P05 limitation (human: accepted, 2026-10-20):** after a JS layout toggle, the category chips, the search form's hidden `layout` input and Clear filters keep their pre-toggle hrefs, so following one drops the toggled layout (`handoffs/phase-05/spec.md` Contract decisions).
- **P05 a11y:** hydrated layout options are `<a role="button" aria-pressed>`; Enter activates them, Space does not (reviewer note).
- **P05:** `LayoutProvider` reads `useSearchParams()`, which only builds without `<Suspense>` because `/` is dynamic; keep `instant = false` on `/`. (Superseded by D-031: phase 07 removes `instant = false`, so the island has to sit inside a `<Suspense>` boundary.)
- **P06 R9 (human: accepted, 2026-10-20):** `.env.example` has `CONTENTFUL_ENVIRONMENT=master` (a default, not a secret).
- **Docs:** ~~`docs/architecture.md` and `agents/ui.md` inaccurate for `/products/[slug]`~~ fixed in Step A (`8a147c9`, D-031/D-032).
- **qa process:** during P05 pre-build, qa ran `pkill -f next-server`, which would also stop a dev server you had running.
