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
