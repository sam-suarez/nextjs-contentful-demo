# Intervention log

Append-only. Every "Where the instructions got in the way" item from each phase, and every human intervention, with the phase and the agent.

## Phase 01: auth core

| Agent | Item |
|---|---|
| orchestrator | The thread started from a pasted continuation prompt, not `/phase`. `/phase` has `disable-model-invocation: true`, so the orchestrator could not invoke it itself, and the D-029 orchestrator path-guard hook was never registered. The orchestrator kept to its Paths table by hand. A shell (python) edit of `handoffs/STATE.md` was blocked by the session's permission classifier, so STATE.md was edited with the Edit tool instead |
| orchestrator | architecture.md's "every file in `src/lib/**` starts with `import \"server-only\";`" clashes with a file-level `"use server"` directive in `actions.ts`, since a directive must come first. Resolved in the spec with function-level `"use server"`. architecture.md should state this |
| orchestrator | architecture.md says the auth actions "re-check the session themselves" without saying what that means when any name is accepted. Interpreted in the spec: login always issues a fresh session, logout deletes unconditionally, neither trusts the proxy |
| orchestrator / reviewer | R18 (and reviewer G5) say "every new file under `src/lib/**`" without saying whether colocated `*.test.ts` files count. Round-1 review returned REVISE on qa-owned, locked test files the builder could not touch. **Human intervention (in-thread):** the human chose to have qa add `import "server-only";` to the three tests, and R18 was amended. architecture.md Data access and `agents/reviewer.md` G5 should say tests are covered |
| orchestrator | `agents/orchestrator.md` has no path for a REVISE whose fix lies entirely in qa paths: step 9 sends a REVISE to the builder, and qa's dispute mode expects a disputed test in `build.md`. qa was dispatched in dispute mode against amended R18, the tests were re-locked, and the round-2 builder dispatch was skipped because nothing was left for the builder to do. qa never got `review.md` (it is in qa's never-open list) |
| qa | The Next 16 proxy doc (`proxy.md`, "Unit testing") names `unstable_doesProxyMatch`, but `next/experimental/testing/server` in 16.4.2 only exports `unstable_doesMiddlewareMatch`. Neither was used: R16 is a literal `config` check |
| qa | `agents/qa.md` input 5 (product mock and schema) does not apply to an auth-only phase. Skipped |
| data-auth | `agents/data-auth.md` input 6 lists the `use-cache`, `cacheLife`, `cacheTag` and auth-with-cache-components docs, which P01 doesn't use. Only skimmed |
| data-auth | The Next auth guide's proxy example reads the cookie with `cookies()` from `next/headers`. The spec (and a qa trap) require `request.cookies`. The spec was followed |
| reviewer | R19 and G1 are judged from what the diff leaves out. That only holds if the diff covers the whole tree, and the reviewer can't confirm this. (The orchestrator confirmed it does: `git add -A` + `git diff --cached HEAD`, excluding `handoffs/`.) |

## Phase 02: data layer

| Agent | Item |
|---|---|
| orchestrator | **Human intervention (start of thread):** the pasted continuation prompt kept its `Human check:` placeholder unfilled. The orchestrator asked; the human answered PASSED for phase 01. The thread again started from a paste, not `/phase`, so the D-029 orchestrator path-guard hook was not registered; Paths kept by hand |
| orchestrator | D-014 says "logged-out requests only ever query `public`", but architecture.md Routes needs a logged-out Set B slug to 307 to `/login` while an unknown slug 404s, which takes a lookup in the authenticated set. Resolved in the spec by reducing that lookup to a bare `{ status }` (R13). D-014 should say "never return" rather than "never query" |
| orchestrator | architecture.md gives `cacheLife(...)` without a profile; the spec picked `"hours"` |
| orchestrator | architecture.md has the page validating search params; the spec moved the unknown-category rule into `filterProducts` so it is unit-tested in `src/lib`. `layout` validation stays in P03 |
| orchestrator | The first qa pre-build dispatch ended with an API error (machine slept) after writing 5 of 6 test files and no `qa.md`. `agents/orchestrator.md` has no step for an interrupted subagent; qa was re-dispatched with the same inputs and finished |
| qa | Vitest 5 defaults to `clearMocks: true`, so `vi.fn` call history from module import (e.g. `cache(...)` at load time) cannot be asserted inside an `it`. Neither architecture.md Tests nor `.claude/rules/tests.md` says so |
| qa | Test files from the interrupted pre-build pass were in the tree, untracked, with no `qa.md`. `agents/qa.md` doesn't say whether to keep or rewrite them; qa reviewed them against the spec, kept them and extended one |
| data-auth | `agents/data-auth.md` Owns lists `src/lib/**`, while the spec's Owned paths narrow the phase to seven files. Followed the spec; the role file could say the spec narrows it |
| reviewer | The reviewer's never-open list covers `src/`, but the spec relies on facts outside the diff (P01's `verifySessionToken` signature, `SLUG_PATTERN`, mock data in the expected-results table). The reviewer judged against the diff and left data-dependent outcomes to qa |

## Phase 03: catalog

| Agent | Item |
|---|---|
| orchestrator | The thread started from a pasted continuation prompt again (`Human check:` filled in as PASSED this time). `/phase` can't be model-invoked, so the D-029 orchestrator path-guard hook was off; Paths kept by hand |
| orchestrator | design.md Page shell puts `<main>` in the root layout, while architecture.md renders the header per page and design.md Accessibility wants sibling `header` / `main` / `footer` landmarks. The spec has each page render `<main>` |
| orchestrator | design.md writes the "Price first" link as `?layout=price`; the spec canonicalises the default layout away (`catalogHref` omits it). design.md could say "the URL without `layout`" |
| orchestrator | design.md's "optional text link" in the banner would split the sentence in the HTML and break exact greps; dropped for P03 |
| orchestrator | Unit tests are Node-only `.test.ts`, so components can't be unit-rendered. Copy and URL logic moved into three plain `.ts` modules; rendered output is checked only by `verify-ssr.sh`, styling only by review |
| orchestrator | React's HTML escaping (`&#x27;`, `&amp;`) and `<!-- -->` text separators decide whether a grep for design.md copy can pass. Neither architecture.md Tests nor `agents/qa.md` mentions it; the spec spelled out the escaped forms and "one text node" rule |
| orchestrator / reviewer | R1 "lockfile changes only by that package" did not say whether npm-derived flag changes on existing entries count (`@types/react`, `csstype` went `dev` → `devOptional`). Reviewer read it as caused by lucide-react and passed it |
| orchestrator | `agents/orchestrator.md` step 7 stages the tree with `git add -A` before review; on a REVISE the orchestrator unstaged it (`git reset`) before the next build round. The procedure doesn't say to |
| qa | `agents/qa.md` pre-build step 3 says every new check must fail first, but absence assertions ("contains none of", streaming markers) can't fail on a page without the catalog. Paired with per-page presence assertions |
| qa | `next build` type-checks `*.test.ts` (tsconfig `include: ["**/*.ts"]`), so a test importing a missing module breaks the build and pre-build `verify-ssr.sh` stops at the build. Neither the spec nor `agents/qa.md` mentions it |
| qa | Checking the spec's lucide icon names before ui installed the package meant installing it into the scratchpad, outside "read nothing else" |
| ui | R24 put `data-layout` and `group` on the grid wrapper, but `group-data-*` only matches descendants, so the wrapper can't switch its own columns. Added an outer wrapper |
| ui | The pop-in keyframe's held `transform` (`animation-fill-mode: both`) overrides a hover `transform`; hover uses the separate `rotate` / `scale` properties. design.md doesn't mention the interaction |
| ui | The first build after the edits served stale scaffold CSS from Turbopack cache (probably from qa's pre-build run); `rm -rf .next` fixed it. No check looks at the CSS output |
| ui | Round 2: design.md's Input focus wording (border + accent shadow, no outline) conflicts with Accessibility's outline on every interactive element; R31 required the outline |
| reviewer | Round 1: R31 REVISE — global `:focus-visible` in `@layer base` lost to `.btn-pop` and `shadow-*` utilities, and the input had `focus:outline-none`. Fixed in round 2 (rule moved outside all layers) |
| reviewer | Command-verified requirements (R14, R15–R23) can only be judged from code plus assertions in the diff. `agents/reviewer.md`'s "insufficient evidence → REVISE" rule, read literally, would REVISE all of them; reviewer.md could say how to treat `Verified by: command / verify-ssr` |

## Phase 04: detail + login (escalated, round 1)

| Agent | Item |
|---|---|
| orchestrator | design.md's detail screen shows an icon-circle-plus-label row above the title but doesn't name a component for it, unlike `Price`/`Badge`/`ProductImageFrame`. Resolved in the spec's Contract decisions by inlining it, matching the un-named card-row precedent from P03 |
| orchestrator | design.md doesn't say whether `/login`'s own "already logged in" redirect should preserve `next`. architecture.md Routes settles it as a plain redirect to `/`; the spec followed architecture.md over a literal reading of the login wireframe, which doesn't show this case |
| qa | The pre-existing P03 `R20` loop in `scripts/verify-ssr.sh` assumed the shared `$FETCHED` list meant "every catalog page fetched so far." That broke once P04 needed to fetch non-catalog pages for the shared `R18` streaming check. Fixed by snapshotting the catalog-only subset (`CATALOG_FETCHED`) before adding P04 fetches |
| qa | Post-build: flagged that R4/R5's `'$X.XX' occurs exactly once` assertions are structurally unsatisfiable on any correctly-rendered page in this app — every page's hydration flight payload escapes `$` as `$$`, so a bare price substring always double-matches. The same `$14.00` appears 3× on the already-shipped, already-passing P03 catalog page; P03 never asserted an exact count on a bare price string, only on the bracketed `>Everyday price<` form. Needs a round-2 test fix (drop the exact-count price assertions or rewrite them bracket/tag-scoped) independent of the escalation below |
| ui / qa | **Escalation.** `docs/architecture.md` ("Session routes … export `instant = false` so they render fully on the server") and `agents/ui.md` ("the fix is `instant = false`, never `<Suspense>`") both describe `instant = false` as forcing full, non-streamed server rendering. `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md` reads the same way ("Set `export const instant = false` … to let it keep blocking on the server"), but `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md` describes it as a dev-time validation/static-shell-validation opt-out only, with no stated runtime-rendering effect. Empirically, for `/products/[slug]` (a dynamic segment with no `generateStaticParams`, and `notFound()`/`redirect()` branches), `npm run build` marks the route `◐` Partial Prerender — unlike `/` and `/login`, which have no dynamic segment and build as `ƒ` fully Dynamic with the same `instant = false`. The practical effect: the `requires-login` and `not-found` branches return HTTP 200 with an empty shell instead of 307/404; the real UI exists only inside a client-hydration flight payload, invisible to `curl` or a no-JS client — the exact D-020 failure mode the architecture is supposed to prevent. The `found` branch renders correctly. ui independently confirmed the `◐` classification is inherent to the bare dynamic segment (reproduces on a no-op page with no DAL call) and that forcing an unconditional `verifySession()` call at the top of the page — the one pattern that makes `/` and `/login` work — does not change the classification. Neither agent could find, within the docs each is scoped to read, a documented way to force a dynamic segment with `notFound()`/`redirect()` branches to fully block in production under Cache Components in this Next.js version. This is a real gap between architecture.md's prescription and the framework's behavior, not resolvable from the spec alone |
| orchestrator | **Human intervention (in-thread):** the human approved the orchestrator's proposal: one more build round to test `await connection()` (`next/server`) at the top of the detail page (the hypothesis is that `/` and `/login` build as `ƒ` because both await request-time `searchParams` first), plus a qa dispute pass to drop the R4/R5 exact-once assertions on bare price strings. If that fails, the fallback is a proxy-based design that needs human approval. The spec was amended ("Amendments (round 2)"). The thread was split at this point to save tokens |

## Phase 04: detail + login (escalated again, round 2)

| Agent | Item |
|---|---|
| orchestrator | **Human intervention:** thread resumed via `/phase` with the human's round-2 decision (spec.md "Amendments (round 2)"). The working tree was dirty with round-1 work on purpose, so the step-0 clean-tree check was waived on the human's instruction. qa dispute mode ran with `Spec: handoffs/phase-04/spec.md` rather than a `build.md` path, because the disputed R4/R5 checks were named in the spec Amendments |
| qa | Dispute: R4/R5 `$28.00`/`$22.40` exact-once checks changed to presence checks (2 lines in `scripts/verify-ssr.sh`). R2/R3/R16/R17 kept. Tests re-locked (17 files) |
| ui | **Escalation (again).** `await connection()` as the first statement of `src/app/products/[slug]/page.tsx` did not change anything: `npm run build` still marks `/products/[slug]` `◐`, and R2/R3/R16 (verify-ssr, 10 failures) and R17 (e2e) still fail with the round-1 symptoms. In this Next.js version, a page that already reads request data still gets a partial-prerender shell on a `[slug]` segment with no `generateStaticParams`, so `connection()` gives it no new signal. architecture.md and agents/ui.md still describe `instant = false` as forcing full server rendering, which the build contradicts for this route |
| orchestrator | **Human decision (round 3):** accept client-side (JS) redirect/404 on `/products/[slug]`; spec Amendments round 3 |
| qa | Round-3 dispute: deleting the 12 R2/R3/R16 server-status checks from `scripts/verify-ssr.sh` was denied by the auto-mode permission classifier as test removal. qa didn't retry, and the orchestrator didn't do it either (not its path, and the denial needs a human). Handed to the human |
| qa | R17 still fails with JS on: after login the URL is the detail page but the catalog grid is still in the DOM. A real ui defect, not a test bug |
| orchestrator | **Human intervention:** at the human explicit instruction, the orchestrator deleted the 12 R2/R3/R16 server-status checks from `scripts/verify-ssr.sh` itself (an exception to its Paths table). `bash -n` OK |

## Batch run: phases 04 (round 3) → 05 → 06 (one thread)

| Agent | Item |
|---|---|
| orchestrator | **Human override (this thread only):** D-026 "one phase per thread, ending at the human gate" suspended. Each phase closes with its `human-check.md` and commit, its human check is recorded as "DEFERRED (batch run)" in STATE.md, and the next phase starts straight away. Escalations go to `handoffs/OPEN-ISSUES.md`, the phase is committed as `wip(...)` (escalated), and the run moves on to any phase that doesn't depend on it. Every other rule stands |
| orchestrator | **Human intervention:** human check line "EDIT DONE" (the 12 R2/R3/R16 server-status checks removed from `scripts/verify-ssr.sh`, per spec Amendments round 3). Working tree dirty with uncommitted phase-04 work on purpose; the step-0 clean-tree check was waived on the human's instruction. The thread started from a pasted `/phase` prompt (`/phase` can't be model-invoked), so the D-029 orchestrator path-guard hook is not registered; Paths kept by hand |
| ui | Round 3: the round-3 amendment accepts client-side `redirect()`/`notFound()` but keeps R17. Under `cacheComponents` those conflict: the logged-out render's `RedirectBoundary` stays in the route's preserved `<Activity>` entry and replays the redirect when the visitor comes back to the same URL. Neither bundled `redirect.md` nor `preserving-ui-state.md` mentions it |
| ui | `docs/architecture.md` and `agents/ui.md` still say `instant = false` makes this route render fully on the server (human follow-up, not edited) |
| qa | Round 3 post-build: `e2e/login.spec.ts:22` URL regex has no start anchor and also matches `/login?next=…`; left as is (locked) |
| orchestrator | **Escalation (round 3 of 3):** R17 fails. Recorded as OI-1 in `handoffs/OPEN-ISSUES.md`. Reviewer not dispatched, because the round limit had already decided the outcome. Phase committed as `wip` under the batch-run override |

## Phase 05: layout toggle (batch run)

| Agent | Item |
|---|---|
| orchestrator | architecture.md says the island flips `data-layout` on the grid wrapper and gets "the current layout and server-rendered `children`", but the control (filter card) and the grid are in different subtrees and the empty state must carry no `data-layout`. Spec resolved it with `LayoutProvider` + `LayoutGrid` + `LayoutToggle` |
| orchestrator | architecture.md / design.md don't say what happens to chips, the search form's hidden `layout` input and Clear filters after a client-side toggle; they keep their pre-toggle hrefs. Spec made the URL the island's source of truth and recorded the limitation for the human |
| orchestrator | design.md names both `aria-pressed` (island) and `aria-current` (links); spec keeps `aria-current` in the server HTML and switches to `role="button"` + `aria-pressed` after mount |
| orchestrator | `npm run test:e2e` exits non-zero while OI-1 is open; the spec named `e2e/login.spec.ts` R17 as the only allowed failure. The procedure has no notion of a known-failing check |
| qa | R5 "every catalog URL" had no explicit list; qa included the empty-state URLs after confirming the toggle renders there |
| qa | R6 "all Set B / member-price checks as in P03" reused the P03 R15/R16 set |
| qa | Pre-build: ran `pkill -f next-server` during a manual curl check, which would also stop a human's dev server. No role file says not to |
| ui | `useSearchParams` builds without `<Suspense>` only because `/` is dynamic (`instant = false`); if `/` ever became prerenderable, Next would demand a boundary (D-020 forbids it) |
| reviewer | The diff can't show command output (boundary script, `ƒ` marker) or runtime behaviour; passed on code evidence plus qa's checks. Notes: the `layout` prop is effectively unused (URL always wins); repeated `?layout=` edge case unprobed; `<a role="button">` activates on Enter only |
