# Round and escalation log

Append-only, owned by the orchestrator. Written after every dispatch; never read during a phase (D-033). Builders and qa never open it.

| Phase | Round | Event | Outcome |
|---|---|---|---|
| 01 | 0 | qa pre-build: 103 tests in 4 files, all fail on missing modules | tests locked (`handoffs/phase-01/tests.sha`) |
| 01 | 1 | data-auth build: all 5 checks pass, no disputes; test lock intact | qa post-build PASS (109 tests) |
| 01 | 1 | reviewer: REVISE on R18 + G5 only (3 test files under `src/lib/**` lack `import "server-only";`); all else PASS | escalated: fix is in qa paths |
| 01 | 2 | human decision: qa adds the import to the 3 tests; R18 amended to cover colocated tests | qa dispute mode, then re-lock, post-build, review round 2 |
| 01 | 2 | qa dispute: added `import "server-only";` line 1 to 3 tests (no other change); re-locked; builder dispatch skipped (nothing in its paths); qa post-build PASS (109 tests); reviewer PASS on R1–R19, G1–G6 | closed, committed |
| 02 | 0 | qa pre-build: first dispatch cut off by an API error (machine slept) after 5 test files; re-dispatched with the same inputs. 142 tests in 6 files, all fail on missing modules only | tests locked (`handoffs/phase-02/tests.sha`) |
| 02 | 1 | data-auth build: 7 files, all 5 checks pass, no disputes; test lock intact | qa post-build PASS (251 tests: 109 P01 + 142 P02) |
| 02 | 1 | reviewer: PASS on R1–R19, G1–G6 | closed, committed |
| 03 | 0 | qa pre-build: 3 unit test files (54 tests) + `scripts/verify-ssr.sh` (~262 assertions over 13 page fetches); unit tests fail on missing modules / `lucide-react`; verify-ssr fails at build (test files are type-checked by `next build`) and, against the starter page, 134 FAIL / 128 PASS (absence checks) | tests locked (`handoffs/phase-03/tests.sha`, 15 files) |
| 03 | 1 | ui build: 6 files edited + 16 created under `src/components/`, all checks pass (verify-ssr 262/262), no disputes; test lock intact | qa post-build PASS (305 unit tests, verify-ssr 262/262, R14 build OK) |
| 03 | 1 | reviewer: REVISE on R31 only (`:focus-visible` in `@layer base` loses to `.btn-pop` / `shadow-*` utilities; search input `focus:outline-none`); all else PASS | back to ui, round 2, fix input `review.md` |
| 03 | 2 | ui build: `:focus-visible` moved outside all `@layer`s, `focus:outline-none` removed from the search input; all checks pass; test lock intact | qa post-build PASS (305 unit, verify-ssr 262/262, R14 build OK) |
| 03 | 2 | reviewer: PASS on R1–R33, G1–G6 | closed, committed |
| 04 | 0 | qa pre-build: extended `scripts/verify-ssr.sh` (R2–R16) + new `playwright.config.ts`/`e2e/login.spec.ts` (R17); 337 passed, 70 expected-failures, all for the right reason | tests locked (`handoffs/phase-04/tests.sha`, 17 files) |
| 04 | 1 | ui build: 4 files created (`src/app/products/[slug]/page.tsx` + `not-found.tsx`, `src/app/login/page.tsx`, `src/components/alert.tsx`); typecheck/lint/unit/client-boundary/build all pass; test lock intact. `npm run build` marks `/products/[slug]` as `◐` Partial Prerender (unlike `/` and `/login`, `ƒ`) despite identical `instant = false`; ui diagnosed this as inherent to the dynamic segment (reproduces on a no-op page) and escalated rather than guess further | escalated before qa post-build formally confirmed it |
| 04 | 1 | qa post-build: confirmed the same root cause independently (`requires-login`/`not-found` branches return 200 with an empty shell instead of 307/404; real UI only in the hydration flight payload). `scripts/verify-ssr.sh` 395 passed / 12 failed; `npm run test:e2e` 1 failed (R17, same symptom client-side). Also flagged R4/R5's exact-count price-string assertions as its own test-authoring bug, unrelated to the escalation | FAIL — escalating instead of a round-2 fix attempt, since the diagnosed cause sits outside ui's owned paths and architecture.md's own prescription |
| 04 | 2 | human decision (2026-10-20): R4/R5 exact-once bare-price counts dropped; ui may add `await connection()` (spec Amendments). Thread started via `/phase` | qa dispute mode |
| 04 | 2 | qa dispute: R4/R5 `$28.00`/`$22.40` exact-once → presence (`has`), 2 lines in `scripts/verify-ssr.sh`; R2/R3/R16/R17 kept; re-locked (17 files) | ui round 2, fix input spec Amendments + qa.md |
| 04 | 2 | ui build: added `await connection()` first in `src/app/products/[slug]/page.tsx` (only change). typecheck/lint/unit (305)/client-boundary/build pass, but the route still builds `◐`; verify-ssr 397 passed / 10 failed (all R2/R3/R16); e2e R17 fails; test lock intact | escalated: amendment trigger fired, proxy-based design needs human approval |
| 04 | 3 | human decision: accept JS-handled 307/404 on `/products/[slug]` (spec Amendments round 3) | qa dispute |
| 04 | 3 | qa dispute: added `e2e/not-found.spec.ts` (2 tests, pass); kept the R3 leak guards and R17; removing 12 R2/R3/R16 server checks in `verify-ssr.sh` blocked by the permission classifier ("Security Test Removal"), not retried | stopped for the human edit; not re-locked |
| 04 | 3 | at the human's explicit instruction, the orchestrator deleted the 12 checks itself (an exception to its Paths table); `bash -n` OK; R3 leak guards kept | re-lock + ui round 3 next thread |
| 04 | 3 | batch-run thread: human check "EDIT DONE"; re-locked (18 files, adds `e2e/not-found.spec.ts`) | ui round 3, fix input qa.md |
| 04 | 3 | ui build: no source change; R17 cause traced to the preserved `<Activity>` entry replaying the client `redirect()`; no fix inside ui paths/spec; test lock intact | escalated by ui |
| 04 | 3 | qa post-build: FAIL on R17 only (typecheck/lint/unit 305/boundary/build OK, verify-ssr 380/380, e2e 2/3) | escalated (3 rounds used): OI-1; no review; committed as wip |
| 05 | 0 | qa pre-build: `playwright.config.ts` (2 projects), `e2e/layout-toggle.spec.ts` (10), `e2e/layout-toggle.nojs.spec.ts` (4), verify-ssr R3/R5/R6 (551 total); 9 JS tests fail on missing `aria-pressed` (no island), guards of unchanged markup pass | tests locked (20 files) |
| 05 | 1 | ui build: `src/components/client/layout-toggle.tsx` (new) + filter-card, product-grid, page; all checks pass, e2e 16/17 (only R17, OI-1); test lock intact | qa post-build PASS |
| 05 | 1 | reviewer: PASS on R1–R15, G1–G6 | closed, committed |
| 06 | 1 | qa release run (post-build mode, no builder): clean build OK, typecheck/lint/unit 305/boundary OK, verify-ssr 551/551, e2e 16/17 (only R17, OI-1), source scan/.env.example/git status OK; test lock intact; diff empty, no review | closed, committed; no fix phases |
| 04-fix1 | 0 | qa pre-build: new `src/lib/products/members-only.test.ts` (51, all fail: missing module), rewritten `src/proxy.test.ts` (21 fail / 25 pass), verify-ssr R4/R10/R11 (16 fail / 594 pass), `e2e/login.spec.ts` R12 anchored to the pathname (fails: OI-1). `npm test` 72 failed / 318 passed. Build red until the helper exists (test type-checked by `next build`) | tests locked (`handoffs/phase-04-fix1/tests.sha`, 21 files) |
| 04-fix1 | 1 | data-auth build: `src/lib/products/members-only.ts` (new) + `src/proxy.ts`; typecheck/lint/unit 390/boundary/build/verify-ssr 610 pass; R11 holds under `next start` (1 cache-fill line for 7 requests); e2e 16/17, disputed `e2e/login.spec.ts` lines 44-45 (whole-DOM counts hit the hidden `<Activity>` copy of the previous page after sign-out); test lock intact | qa dispute |
| 04-fix1 | 1 | qa dispute: test was wrong; post-sign-out checks made visibility-aware, plus no `session` cookie and whole-DOM counts after `page.reload()`; re-locked (21 files). Builder not re-dispatched (nothing in its paths, P01 precedent) | qa post-build |
| 04-fix1 | 1 | qa post-build PASS: typecheck, lint, unit 390/390, boundary, build, verify-ssr 610/610, e2e 17/17 (R12 5/5 with `--repeat-each=5`); lock intact | review |
| 04-fix1 | 1 | reviewer: PASS on R1–R14, G1–G6 (notes: hidden Set B DOM after sign-out → OI-2) | closed, committed; OI-1 closed |
| 07 | 0 | qa pre-build: new `e2e/layout-shift.spec.ts` (12 tests: 3 URLs × logged out/in × 1280×720/375×812; CLS < 0.01 + skeletons seen with `aria-busy` then gone), all 12 fail on "skeleton shown during load" (no skeletons yet); D-031 removals done with no permission denial: verify-ssr R18 loop (4 streaming/fallback asserts), `chromium-no-js` project, `e2e/layout-toggle.nojs.spec.ts` deleted. verify-ssr 474/474, other e2e 13/13 | tests locked (`handoffs/phase-07/tests.sha`, 21 files) |
| 07 | 1 | ui build: `src/components/skeletons.tsx` (5 skeletons) + Suspense in `/`, detail, `/login`, header; shared frame constants in `ui-classes.ts`; `instant = false` and `connection()` removed; mobile header reworked to a fixed 48 px session row so both states match (flagged); typecheck/lint/unit 390/boundary/build/e2e 25 pass; verify-ssr 473/1, disputed P04 R7 breadcrumb-order needle (matches flight data before the HTML); lock intact | qa dispute |
| 07 | 1 | qa dispute: test was wrong; needle anchored to `>Cloud Bunny Plush<` (stricter); re-locked (21 files); builder not re-dispatched (nothing in its paths) | qa post-build |
| 07 | 1 | qa post-build PASS: typecheck, lint, unit 390, boundary, build (all three routes `◐`), verify-ssr 474/474, e2e 25/25 (layout-shift 36/36 with `--repeat-each=3`), R1 grep/find empty; lock intact | review |
| 07 | 1 | reviewer: REVISE on R3 (4 skeleton blocks not `rounded-md`) and R8 (detail skeleton always draws the sign-in row, taller than the logged-in body; catalog size match not shown in the diff); rest PASS | back to ui, round 2, fix input `review.md` |

| 07 | 2 | workflow optimisation (D-033) applied between rounds by the human, outside the orchestrator | resume at step 5 (test lock), then step 6 under the new procedure |
| 07 | 2 | ui build (fix input `review.md`): R3 skeleton blocks `rounded-md`; R8(a) fixed 80 px `DETAIL_PRICE_FOOTER` so the price card is the same height logged in/out (visible change: logged-out sign-in row always stacked, members get an empty 80 px row); R8(b) skeletons share size constants with the real components (`ui-classes.ts`; `LayoutToggle` imports `LAYOUT_OPTION`, props unchanged); all checks pass per build.md (verify-ssr 474/474, e2e 25/25); flags for the human: header layout below `md`, reserved banner/login-note heights, detail price row | step 5 lock check OK (21 files) |
| 07 | 2 | qa post-build dispatch rejected: the human stopped the thread to hand over | resume at step 6 in a new thread |
| 07 | 2 | qa-run post-build PASS (typecheck, lint, unit 390/390, boundary, build all three routes `◐`, verify-ssr 474/474, e2e 25/25, R1 command empty; lock intact). qa-run left `qa.md` unchanged because every result matched the round-1 section; fresh `.next/BUILD_ID` and `test-results/` timestamps confirm the rerun | wait for reviewer |
| 07 | 2 | reviewer: PASS on R1–R14, G1–G6 (notes: visible layout changes for human sign-off; skeleton sizes tuned to mock data; unknown slug answers 200 + noindex) | closed, committed; human check DEFERRED (batch run) |
| 08 | 0 | spec written (R1–R11; R9 = P06 R8 inverted for D-031); tests locked (`handoffs/phase-08/tests.sha`) | qa-run release run |
| 08 | 1 | qa-run release run (post-build mode, no builder): clean build OK (all three routes `◐`, no warnings), typecheck/lint/unit 390 (15 files)/boundary OK, verify-ssr 474/474, e2e 25/25, layout-shift 36/36 (`--repeat-each=3`), R9 scan (Suspense in 4 files; no `instant`, `loading.tsx`, `NEXT_PUBLIC_`; `server-only` first line; proxy matcher `/login`, `/products/:slug`), `.env.example`, git status OK; test lock intact; diff empty, no review | closed, committed; no fix phases; human check DEFERRED (batch run) |
| — | — | batch-run thread 2 end: `handoffs/VERIFY.md` written (deferred checks 04, 05, 06, 04-fix1, 07, 08; Step A read-through; OI-2; phase 07 layout changes) | stop, hand to the human |
| — | — | human check (VERIFY.md): 04, 05, 06, 07, 08 PASSED; 07 layout changes accepted; D-031/D-032 numbering kept; 04-fix1 FAILED (OI-2), OI-2 = option 2 (D-034) | open 04-fix2 |
| 04-fix2 | 0 | escalated before spec: D-034 (`POST /logout` route handler, logout action removed) contradicts `docs/architecture.md:17,64`, is not in `docs/decisions.md`, and spans ui + data-auth paths; doc edits drafted in `handoffs/phase-04-fix2/human-check.md` | stop, hand to the human |
| 04-fix2 | 0 | human committed the D-034 docs (6d142c0); escalation lifted; Origin check = yes, one phase with ui then data-auth (human override); spec written (R1–R12) | qa pre-build |
| 04-fix2 | 0 | qa pre-build: tests written (route.test.ts 24, actions.test.ts R10, verify-ssr +22, e2e R11), all fail as expected; OI-A: contract's `request.url` origin is always localhost under next start, would 403 real sign-out | spec amended (Origin host vs x-forwarded-host ?? host); qa dispute mode |
| 04-fix2 | 0 | qa dispute (amendment): R2/R3 unit cases changed in route.test.ts only; tests locked (tests.sha) | ui step A round 1 |
| 04-fix2 | 1 | ui step A: route.ts + header form; all checks pass except actions R10 (expected, step B); lock intact | data-auth step B round 1 |
| 04-fix2 | 1 | data-auth step B: logout removed from actions.ts; all checks pass (unit 414, verify-ssr 495, e2e 25); lock intact; diff taken | qa-run post-build + reviewer (parallel) |
| 04-fix2 | 1 | qa-run post-build PASS (unit 414, verify-ssr 495/495, e2e 25/25, build `◐`×3 + `/logout` `ƒ`, R9 grep empty); reviewer PASS R1–R12, G1–G6 (notes: host-only Origin compare vs architecture.md "origin" wording; no Host normalisation, fails closed) | closed, committed |
| 04-fix2 | — | human check PASSED (in-thread) | — |
| — | — | repo cleanup before submission (human, plain session, 2026-10-21): `handoffs/OPEN-ISSUES.md` renamed `handoffs/ESCALATIONS.md` (IDs OI-1/OI-2 kept, decisions written in); `handoffs/VERIFY.md` retired, since every item in it was checked or decided, and replaced by the browser checklist `docs/manual-qa.md`; `handoffs/phase-*/diff.patch` untracked and gitignored (each equals the phase commit's diff, `git show <sha> -- . ':(exclude)handoffs'`) | rows above that name VERIFY.md or OPEN-ISSUES.md refer to those files |
| — | — | `/ship` replaces `/phase`; architect agent and reviewer docs mode added (D-035, human, plain session, 2026-10-21) | next work starts with `/ship <feature>`; next phase 09 |
| feature member-savings | A1 r1 | interview round 1 (placement, data, rounding, copy) | cards + detail; DAL computes `savingsPercent`; nearest whole, hidden at 0; copy "You save 20%" (all recommended / requested wording) |
| feature member-savings | A1 r2 | interview round 2 (position, style, logged-out teaser) | own line under the amount (not recommended: recommended was same row); mint pill; no logged-out teaser |
| feature member-savings | A1 r3 | interview round 3 (reserved row, specs-first position) | reserve the row in every state (shared constant); specs first: under the amount, right-aligned. `intake.md` written (D-036) |
| feature member-savings | A2 | Confirm 1 (decisions) | approved |
| feature member-savings | A3 r1 | architect dispatched | done: architecture.md, design.md, decisions.md (D-036), rules ssr-rendering + client-islands; no Contentful/schema/mock change |
| feature member-savings | A5 r1 | reviewer (docs mode) dispatched | PASS (I1–I9, DG1–DG7); 4 notes (quaternary token use, D-036 citation placement in architecture.md Tests, `ui-classes.ts` path, "Who builds what" not updated) |
| feature member-savings | A6 | Confirm 2 (docs diff) | approved as is |
| feature member-savings | A7 | phases 09 (data-auth), 10 (ui) registered; docs commit | status build |
| 09 | spec | spec written (R1–R8) | qa pre-build next |
| 09 | qa pre-build r1 | qa dispatched | tests written (savings 20 new, to-catalog-product, dal); flagged unowned `filter.test.ts` fixture → spec amendments A1 (add to qa paths), A2 (finite inputs only) |
| 09 | qa pre-build r2 | qa dispatched (A1) | `filter.test.ts` fixture updated; 32 expected failures + savings module missing; ready |
| 09 | human | shared working tree: session nextjs-contentful-demo-51 edited agents/, .claude/ and added a /ship-minor lane citing D-036, then reverted | continue, guard each step (git status before lock, diff, commit) |
| 09 | build r1 | data-auth dispatched | savings.ts, types.ts, to-catalog-product.ts; all checks pass per builder; no disputes |
| 09 | post-build r1 | qa-run dispatched | PASS (typecheck, lint, 454 unit, boundary, build, verify-ssr 495); e2e not run (missing from spec Checks) |
| 09 | review r1 | reviewer dispatched | PASS (R1–R8, G1–G6) → close |
| 09 | human check | asked (steps in message only) | not answered: human could not see the steps behind the question dialog → proposed /ship improvement logged; re-asked with steps in the preview |
| 09 | human check | re-asked with steps in preview | PASSED |
| 10 | spec | spec written (R1–R12; e2e in Checks) | qa pre-build next |
| 10 | qa pre-build r1 | qa dispatched | format.test.ts (+4), verify-ssr P10 section (8 expected fails), e2e/savings.spec.ts (18 expected fails); existing e2e 25 pass; gap: no price-card DOM hook (finder used) |
| 10 | build r1 | ui dispatched | all checks pass except e2e savings.spec.ts R4 row-height test (flaky under pop-in animation); disputed |
| 10 | post-build r1 (dispute) | qa dispatched | dispute: test changed (settleAnimations before measuring R4; assertions unchanged); all 7 checks PASS (unit 458, verify-ssr 514, e2e 43); re-locked; builder not re-dispatched |
| 10 | review r1 | reviewer dispatched | PASS (R1–R12, G1–G6) → close |
| 10 | human check | asked with steps in preview | PASSED |
| feature member-savings | C1–C2 | pr.md written; STATE pr-open | push + gh pr create next |
| feature member-savings | step 0 | gh pr list | PR #1 MERGED (c21a177); recorded, feature cleared |
| feature price-sort | step 0 | new feature from main (cbdf068) | branch feature/price-sort; status interview, step A1 |
| feature price-sort | A1 round 1 | asked rendering, options, sort key, control | client reorder (island gets index orders only), price ↑/↓ only (not recommended 3 options), shown price + name ties, segmented control |
| feature price-sort | A1 round 2 | asked copy, toggle-off, URL state, placement | Price: Low to high / High to low; active click does nothing (not recommended toggle-off); kept by all, cleared by Clear; beside Layout |
| feature price-sort | A1 round 3 | asked stale server links after client sort | accept like layout (known limitation; not recommended) |
| feature price-sort | A1 | intake.md written (D-038, phases 11 data-auth, 12 ui) | status docs, step A2 |
| feature price-sort | A2 | Confirm 1 | approved |
| feature price-sort | A3 r1 | architect dispatched | docs written (architecture, design, decisions D-038, rules/client-islands.md); checks pass; no data changes |
| feature price-sort | A5 r1 | reviewer dispatched (docs) | PASS (I1–I9, DG1–DG7); 5 notes, G6 wording vs D-038 |
| feature price-sort | A6 | Confirm 2 | approved as is (tidy-ups declined) |
| feature price-sort | A7 | phases 11, 12 registered (STATE, CONTRACTS) | status build; docs commit |
| 11 | spec | spec.md written (R1–R10) | qa pre-build next |
| 11 | pre-build | qa dispatched | sort.test.ts (38 tests) fails on missing module only; typecheck 1 error (TS2307) |
| 11 | lock | tests.list + tests.sha written | build round 1 next |
| 11 | build r1 | data-auth dispatched | sort.ts; all checks pass (unit 496, verify-ssr 514); no open issues |
| 11 | lock check r1 | shasum + list | unchanged |
| 11 | review r1 | reviewer dispatched | PASS (R1–R10, G1–G6) |
| 11 | post-build r1 | qa-run dispatched | PASS (7 checks: unit 496, verify-ssr 514, e2e 43) → close |
| 11 | human check | asked with steps in preview | PASSED |
| 12 | spec | spec.md written (R1–R17) | qa pre-build next |
| 12 | pre-build | qa dispatched | tests written (unit, verify-ssr P12 section, e2e price-sort + CLS sorted URL); all new fail on missing feature; Open issue: R14 last sentence contradicts D-038 limitation |
| 12 | escalation | OI-3 opened | asking the human |
| 12 | OI-3 | human answer | drop R14 last sentence (not recommended: qa version) → amendment A1; qa dispute mode to remove the test |
| 12 | dispute (A1) | qa dispatched | removed the R14 layout-after-sort test + unused SPECS_FIRST; nothing else |
| 12 | lock | tests.list + tests.sha written | build round 1 next |
| 12 | build r1 | ui dispatched | all checks pass except e2e price-sort.spec.ts:384 (Ctrl+click on macOS Chromium fires contextmenu, no click); disputed |
| 12 | lock check r1 | shasum + list | unchanged |
| 12 | post-build r1 (dispute) | qa dispatched | dispute: test changed (Ctrl+click expects contextmenu on darwin, click elsewhere; assertions unchanged); all 7 checks PASS (unit 515, verify-ssr 744, e2e 65); only price-sort.spec.ts differs; re-locked; builder not re-dispatched |
| 12 | review r1 | reviewer dispatched | PASS (R1–R17, G1–G6) → close; 3 layout notes for the human check |
