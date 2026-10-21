# Escalations

Problems the agents were not allowed to decide on their own, so the pipeline stopped and handed them to the human. Owned by the orchestrator. IDs (`OI-n`) are cited from the phase folders, the logs and `docs/decisions.md`.

**Both are closed.** No escalation is open.

| ID | Problem | Caught by | Decision | Fixed in |
|---|---|---|---|---|
| OI-1 | Signing in from a members-only link landed on the catalog, not the product | qa's e2e test (phase 04, R17) | Proxy answers a real 307 for members-only slugs (D-032); move to `<Suspense>` skeletons (D-031) | `phase-04-fix1` (`5f15cd8`) |
| OI-2 | After sign-out, the members-only page you just left stayed hidden in the DOM | data-auth + qa during 04-fix1; the human check failed on it | Sign out posts to a `/logout` route handler that answers 303, so the browser does a full page load (D-034) | `phase-04-fix2` (`841459a`) |

---

## OI-1 · Signing in from a members-only link landed on the catalog

- **Caught by:** qa's end-to-end login test (phase 04, R17), written from the spec before the build.
- **What the agents did:** three ui build rounds (`instant = false`, then `await connection()`, then a diagnosis with no code change). After round 3 the pipeline stopped, as the round limit requires (D-024). The fix was outside the ui agent's owned paths and contradicted the architecture as written at the time, so it needed a human decision.
- **Decision (human, 2026-10-20):** a logged-out request for a members-only slug gets a 307 from `src/proxy.ts` before rendering (D-032). Same day: drop `instant = false` and use `<Suspense>` with layout-matched skeletons (D-031).
- **Fixed in:** `phase-04-fix1` (`5f15cd8`). verify-ssr 610/610, e2e 17/17. Skeletons followed in phase 07 (`b6b3a9d`).

### Detail

**Symptom.** A logged-out visitor opens `/products/forest-friends-activity-cube`, is sent to `/login?next=/products/forest-friends-activity-cube`, and signs in. The URL briefly shows the product, then the browser ends on `/` showing the catalog.

**Cause.** With `cacheComponents` on, `/products/[slug]` built as a partial prerender (`◐`), so `redirect()` ran in the browser instead of as a server 307. Next keeps the previous route in a hidden `<Activity>` keyed by URL; returning to the same URL re-showed the logged-out render, and its redirect fired again. The architecture's premise that `instant = false` forces full server rendering was wrong: the bundled `instant.md` describes it as a dev-time validation switch only. (Found by ui from `node_modules/next/dist/client/components/layout-router.js` and `redirect-boundary.js`; confirmed independently by qa with a network trace.)

**Options put to the human.** (1) Proxy redirect for members-only slugs. (2) Hard navigation after login. (3) `generateStaticParams` for the route. (4) Accept the bug and rewrite R17. Option 1 was chosen because it also restores the real 307 from D-018.

**While open.** Phase 05 (layout toggle) did not depend on this route and ran; phase 06 (release check) recorded R17 as the single known failure under this issue rather than opening a fix phase.

## OI-2 · After sign-out, the previous members-only page stayed hidden in the DOM

- **Caught by:** data-auth and qa during `phase-04-fix1` (an e2e check counted the members-only product name in the DOM after sign-out); confirmed in the reviewer's notes. Recorded as non-blocking, then the human check of 04-fix1 failed on it.
- **Decision (human, 2026-10-21):** sign out is a plain `<form method="post" action="/logout">`. `src/app/logout/route.ts` answers 303 to `/`, so the browser does a full document load; it rejects a foreign `Origin` with 403. The `logout` server action is removed (D-034).
- **Fixed in:** `phase-04-fix2` (`841459a`). e2e checks the whole DOM after sign-out with no reload.

### Detail

**Symptom.** Sign in, open a members-only product, click Sign out. You land on `/`, logged out, and nothing members-only is visible. But the product you just left (name, member price) was still in the DOM with `display: none` until the next full page load. Nothing new reached a logged-out visitor (verify-ssr passed); it was a client-side leftover of what the member had already seen.

**Cause.** The same `<Activity>` behaviour as OI-1 (`cacheComponents.md`, "Navigation with Activity"). A server-action redirect is a client-side navigation, so the old route stayed mounted.

**Options put to the human.** (1) Accept it. (2) Full page load on sign-out. (3) Refresh the router cache on sign-out (untested). Option 2 was chosen: it is the only one that provably drops the old DOM, and it works without JS.

## Smaller items raised along the way (all resolved)

- **Decision numbering.** The human's prompt named the two new decisions D-030 and D-031, but D-030 was already taken (`AGENTS.md` vs `AGENT.md`). The orchestrator used D-031 and D-032 instead of renumbering an existing row. The human kept that numbering (2026-10-21).
- **Layout toggle and filter links (accepted, 2026-10-20).** After a JS layout toggle, the category chips, the search form's hidden `layout` input and Clear filters keep their pre-toggle hrefs, so following one returns to the default layout.
- **Layout toggle keyboard.** The hydrated options are `<a role="button" aria-pressed>`: Enter activates them, Space does not (reviewer note, phase 05).
- **`.env.example` (accepted, 2026-10-20).** It ships `CONTENTFUL_ENVIRONMENT=master`, a default, not a secret.
- **Phase 07 layout changes (accepted, 2026-10-21).** To keep the skeleton swap free of layout shift, the session controls take their own row below `md`, the banner and login note keep a minimum height, and the detail price card reserves the same height logged in and out. `docs/design.md` was updated to match. The mobile header row and the empty member row were later replaced by hand after deploy (intervention log).
- **qa process.** During phase 05 pre-build, qa ran `pkill -f next-server`, which would also stop a human's dev server. Noted in the intervention log.
