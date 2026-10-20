# Decision log

| ID | Part | Decision | Options considered | Chosen | Why | Date |
|----|------|----------|--------------------|--------|-----|------|
| D-001 | 1 | Package manager | pnpm, npm, yarn | npm | Zero install friction for reviewers; universally available | 2026-10-19 |
| D-002 | 1 | Node version pinning | .nvmrc + engines, engines only, none | .nvmrc (24) + `engines.node >=20.9` | Aligns local/CI/Vercel runtime; Next.js 16 requires 20.9+ | 2026-10-19 |
| D-003 | 1 | App directory layout | src/, root app/ | `src/` | Separates app code from agents/docs/handoffs; enables path-scoped agent rules | 2026-10-19 |
| D-004 | 1 | Import alias | @/*, ~/*, none | `@/*` | Scaffold default; most reliably reproduced by LLMs | 2026-10-19 |
| D-005 | 1 | Tailwind version | v4, v3 | v4 (CSS-first config) | Current default; agents explicitly told "no tailwind.config.js" | 2026-10-19 |
| D-006 | 1 | AI tool running the pipeline | Claude Code, Cursor, Copilot, tool-agnostic manual | Claude Code | Real subagents with isolated context force file-based handoffs, which are demonstrable in AGENT.md | 2026-10-19 |
| D-007 | 1 | `.claude/agents/` wrappers | thin wrappers, none, full defs in .claude | Thin wrappers (frontmatter + "follow /agents/X.md") | `/agents/` stays the single, tool-agnostic source of truth; wrappers only make it runnable | 2026-10-19 |
| D-008 | 1 | Unit/integration test runner | Vitest, Jest, none | Vitest | Native ESM/TS, minimal config; async RSCs covered by e2e instead | 2026-10-19 |
| D-009 | 1 | SSR verification | Playwright JS-disabled, curl script, both | Both: Playwright (JS disabled) + `scripts/verify-ssr.sh` (curl + grep raw HTML) | curl = browserless gate agents run every phase; Playwright covers UI flows | 2026-10-19 |
| D-010 | 1 | Commit strategy | per phase on main, branch per part + PR, squash at end | Commit per phase on main; manual fixes as separate commits | Git log maps 1:1 to STATE.md phases and intervention log | 2026-10-19 |
| D-011 | 1 | Commit message format | Conventional + agent trailer, Conventional only, free-form | Conventional Commits + `Agent: <name>` / `Agent: manual` trailer | Greppable attribution of agent vs manual work | 2026-10-19 |
| D-012 | 1 | Session cookie library | jose, iron-session, hand-rolled Web Crypto HMAC | jose (HS256 JWT in HttpOnly cookie, signed with `SESSION_SECRET`) | Edge+Node compatible so proxy and server can both verify; matches Next.js auth docs; payload signed not encrypted, so no secrets in it | 2026-10-19 |

## Defaults applied (no real trade-off)
- create-next-app@16.4.2 flags: TypeScript, App Router, ESLint (flat config, `eslint-config-next`), Turbopack (Next 16 default), React Compiler off (scaffold default)
- `@types/node` bumped to ^24 (matches `.nvmrc`; vitest@5 peer requires ^22 or >=24); `engines` stays `>=20.9`
- Scripts added: `typecheck` (`next typegen && tsc --noEmit`, so route types like `LayoutProps` exist on a clean clone), `test` (`vitest run --passWithNoTests`), `test:e2e` (`playwright test`)
- Vitest alias `@` → `src` configured in `vitest.config.mts` (no extra plugin)
- Scaffold `AGENTS.md` (Next.js agent rules block, auto-managed by `next dev`) kept as-is for now
- `.gitignore`: `!.env.example` re-included; Playwright output dirs ignored
- Playwright browsers not installed yet; config + `npx playwright install chromium` deferred to when e2e tests are written
