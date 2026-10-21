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
