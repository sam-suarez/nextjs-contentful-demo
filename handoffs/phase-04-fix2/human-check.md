# Phase 04-fix2: Human check

**Status:** escalated before spec (not committed)
**Result:** <filled in by the orchestrator at the start of the next thread>

## Escalation

**Why I stopped.** You asked for D-034: Sign out posts to a `POST /logout` route handler that answers 303 to `/`, and the `logout` server action is removed (OI-2 option 2). Three things stop me from writing that spec:

1. **architecture.md says the opposite.**
   - `docs/architecture.md:17`: "Logout is a server action, not a route."
   - `docs/architecture.md:64`: "Login and logout are server actions in `src/lib/auth/actions.ts`."
   - The orchestrator may not write a spec that contradicts architecture.md, and it may not edit architecture.md.
2. **D-034 doesn't exist yet.** `docs/decisions.md` ends at D-033, and the orchestrator may not edit that file either. `docs/design.md:116` also says the Sign out form posts "the logout server action".
3. **The fix crosses two builders' paths.**
   - ui owns `src/app/logout/route.ts` (new) and `src/components/site-header.tsx` (the form).
   - data-auth owns `src/lib/auth/actions.ts`, where the `logout` action is removed.
   - The action can't be removed while the header still imports it.

**What you need to do.** Apply the edits below by hand, then commit them together with this thread's `handoffs/` changes (`Agent: manual`). Then run `/phase` again (see the last section). Please also answer questions A and B. Write your answers in that `/phase` line.

### Proposed `docs/decisions.md` row (append after D-033)

```
| D-034 | 5 | Sign-out flow (human decision, OI-2 option 2; amends D-017's logout half) | accept the hidden DOM, full page load on sign-out, router refresh on sign-out | Sign out is a plain `<form method="post" action="/logout">`. `src/app/logout/route.ts` exports only `POST`: it calls `deleteSession()` and answers `303` with `Location: /`, so the browser does a full document load. The `logout` server action is removed; `src/lib/auth/actions.ts` exports only `login` | With Cache Components the client router keeps the previous route in a hidden `<Activity>`; a server-action redirect is a client-side navigation, so after sign-out the members-only page stayed in the tab's DOM until reload (OI-2). A native form POST answered with 303 is a document navigation that drops it, and it works without JS | 2026-10-21 |
```

(If you answer "yes" to question A, add this to the Chosen column: "A request whose `Origin` header is present and differs from the app's origin gets 403.")

### Proposed `docs/architecture.md` edits

- Heading `## Routes (D-017, D-018, D-032)`: change it to `## Routes (D-017, D-018, D-032, D-034)`.
- Add this row to the Routes table:
  `| /logout | Route handler, POST only: deletes the session cookie, answers 303 with Location: / (full page load). No page; other methods get 405 | Any (works with or without a session) |`
- Replace line 17's first sentence with: "Logout is the `POST /logout` route handler (`src/app/logout/route.ts`), not a server action, so sign-out ends in a full page load (D-034)."
- Heading `## Auth (D-012, D-017, D-032)`: add D-034.
- Replace line 64 with: "Login is a server action in `src/lib/auth/actions.ts`; it validates input with zod and re-checks the session itself. Logout is the `POST /logout` route handler, which calls `deleteSession()` from `src/lib/session.ts` (D-034)."
- Under `## Tests`, add this line: "Sign-out is checked at the HTTP level (POST `/logout` with a session: 303, `Location: /`, the `session` cookie cleared) and in e2e (after Sign out, with no reload, no Set B name anywhere in the DOM) (D-034)."

### Proposed `docs/design.md` edit

- Line 116: change "(a `<form>` posting the logout server action, so it works without JS)" to "(a plain `<form method="post" action="/logout">`, so it works without JS; D-034)".
- Optional, separate from D-034: you accepted every phase 07 layout change. design.md still describes the old layout:
  - "Logged in: … no sign-in row"
  - the detail sign-in row shown side by side
  - the header session controls inline below `md`

  A later ui reviewer will hold builders to design.md. Updating those lines to match what was built avoids a false REVISE.

### Questions for you

- **A. Origin check on `POST /logout`?** A route handler doesn't get the Origin check that Server Actions do, so any site could submit a form that signs the visitor out (forced logout; low impact, nothing leaks).
  - **(a) Recommended: add the check.** A request whose `Origin` is present and doesn't match gets 403.
  - **(b) No check.**
- **B. How to split the build.**
  - **(a) Recommended: two fix phases, one thread each.**
    - `04-fix2` (ui): `src/app/logout/route.ts` and the header form posting to `/logout`.
    - `04-fix3` (data-auth): remove `logout` from `actions.ts`. qa updates `actions.test.ts` R12/R13 (exports only `login`) in that phase.
  - **(b) One phase with two builder dispatches (ui, then data-auth).** This needs a one-thread override of "one builder per phase".

### What the fix will be checked against (draft requirements, for your sign-off)

- **Unit** (`src/app/logout/route.test.ts`): `POST` calls `deleteSession()` once and returns 303 with `Location` ending in `/`. The module exports only `POST`.
- **verify-ssr:**
  - `curl -X POST /logout` with a session cookie: `303`, `location: /`, and a `Set-Cookie` that clears `session`.
  - `GET /logout`: `405`.
- **e2e** (`e2e/login.spec.ts`): sign in from a members-only product, then click Sign out. A document request for `/` happens, and **with no reload** "Forest Friends Activity Cube", "Signed in as" and "Member price" each have 0 matches in the whole DOM. This replaces the visible-only checks qa added in 04-fix1.
- **Review:** the header form is `method="post" action="/logout"`, and no file imports `logout` from `@/lib/auth/actions`. After 04-fix3, `actions.ts` exports only `login`.

## Verify it yourself (about 5 minutes, after the edits)

1. `git diff --stat`. Expect: `docs/decisions.md`, `docs/architecture.md`, `docs/design.md` and `handoffs/**` only.
2. `grep -n "D-034" docs/decisions.md docs/architecture.md docs/design.md`. Expect: the row, plus the Routes, Auth, Tests and design.md mentions.
3. `grep -n "Logout is a server action" docs/architecture.md`. Expect: no output.

## Continue in a new thread

Commit the edits and these handoffs, then in a fresh Claude Code session at the repo root run:

`/phase FIXED MANUALLY: D-034 docs edits, <sha>; origin check = <a|b>; split = <a|b>`

`/phase` is the only entry point: it turns on the orchestrator's path guard (D-029, D-033).
