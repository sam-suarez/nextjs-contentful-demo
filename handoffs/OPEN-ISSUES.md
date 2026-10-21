# Open issues

Escalations from the batch run (phases 04 → 05 → 06, one thread; D-026 suspended by the human for that thread). Owned by the orchestrator. Each entry names the decision the human needs to make.

## OI-1 · Phase 04 · R17 (and R3 by extension): signing in from a members-only redirect lands on `/`, not the product

**Status:** open, escalated (3 of 3 build rounds used). Phase 04 committed as `wip(detail): … (escalated: …)`.

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
