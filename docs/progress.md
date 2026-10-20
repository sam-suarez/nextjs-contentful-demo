# Progress

**Current part:** 1 — Repo and tooling: **complete**
**Next part:** 2 — Data model and Contentful

## Done in Part 1
- `docs/assessment-summary.md` written (never re-read the PDF from now on)
- Decisions D-001 to D-012 logged (npm, Node pin, src/, @/*, Tailwind v4, Claude Code + thin wrappers, Vitest, SSR verified via curl + Playwright no-JS, commit per phase, Conventional + `Agent:` trailer, jose)
- Scaffold: Next 16.4.2, React 19.3, Tailwind v4, ESLint 9 flat config
- Deps: contentful, server-only, jose, zod; dev: vitest, @playwright/test, @types/node ^24
- typecheck / lint / test / build all green; git initialised on `main`

## Next step
- Part 2, first decision: Set A/B modeling (visibility field vs two content types vs boolean)

## User-required patterns (D-013), build when their part arrives
- Part 3 (architecture/conventions): path-scoped rules, i.e. SSR (no `'use client'` on price/Set B render paths) for `src/app/**`, server-only for `src/lib/**`, flat tests for `**/*.test.ts`
- Agent-design part: context-blind, read-only Reviewer agent (spec + diff only → PASS/REVISE/BLOCK per requirement)
- Pipeline setup / before the first dry run: hooks running typecheck + `scripts/verify-ssr.sh` after edits; SSR checks must assert both directions (Set B present when logged in, absent when logged out)
- Part 5 onward: every handoff ends with "where the instructions got in the way", feeding `docs/intervention-log.md` and AGENT.md

## Open questions
- The guide prompt was pasted truncated (it cuts off in Part 3 at "A Set B slug when"). Save the full text to `.claude/commands/guide.md` so `/guide` works in new threads.
- Naming: the scaffold's `AGENTS.md` (Next.js auto-managed rules) vs the deliverable `AGENT.md`. Decide on co-existence or merging when AGENT.md is written.
- Playwright config + browser install are deferred until e2e tests exist.

## Blockers
- None
