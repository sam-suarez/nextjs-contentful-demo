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
| D-013 | 1 | User-required agent-system patterns (dictated by user) | adopt now + build in-part, new Part 1.5 skeletons, rewrite guide parts | Required by user; build each in the part where its dependencies exist: build each in the part where its dependencies exist: (1) context-blind read-only Reviewer agent (PASS/REVISE/BLOCK per requirement, never sees builder reasoning); (2) path-scoped rules (`.claude/rules/*.md` with `paths:`) for SSR / server-only / tests; (3) hooks that run the checks after edits (typecheck, `verify-ssr.sh`); (4) "where the instructions got in the way" section in each handoff, feeding the intervention log and AGENT.md | Each depends on routes/agents/scripts not yet decided; building now means rewrites. Logging keeps them from being lost across threads | 2026-10-19 |
| D-014 | 2 | Set A/B modeling | `visibility` enum field, two content types, boolean flag | Single `product` content type with required `visibility: "public" \| "authenticated"` | One type / one zod schema / one fetch fn for agents; visibility is a single server-side query filter (logged-out requests only ever query `public`, so Set B never reaches HTML or RSC payload); filter/search/slug resolution uniform across sets; new tiers = new enum value | 2026-10-19 |
| D-015 | 2 | CMS source | live Contentful space, mocked JSON seed, both behind one adapter | Live Contentful space (user-chosen); types derived from a real CDA response; JSON mock generated from that same response (asset URLs rewritten to local `public/` copies) | Real integration for the demo; mock stays structurally identical to live data, so mock mode cannot drift from the real shape | 2026-10-19 |
| D-016 | 2 | Mock shape + schema | mock = normalized `Product[]`, mock = raw REST response, mock = SDK collection | Mock = exact SDK collection from `client.withoutUnresolvableLinks.getEntries({content_type:"product", order:["fields.name"]})`, asset URLs rewritten to `/products/<fileName>`; zod schema in `src/schemas/product.ts` validates both live and mock | Mock and live share one parse path, so mock mode tests the real mapping; `withoutUnresolvableLinks` turns broken asset links into an absent `image` (hits the fallback) instead of a bare Link; schema lives outside `src/lib` because client filter UI needs Category/Visibility and `src/lib/**` is planned server-only (D-013) | 2026-10-19 |

## Defaults applied (no real trade-off)
- create-next-app@16.4.2 flags: TypeScript, App Router, ESLint (flat config, `eslint-config-next`), Turbopack (Next 16 default), React Compiler off (scaffold default)
- `@types/node` bumped to ^24 (matches `.nvmrc`; vitest@5 peer requires ^22 or >=24); `engines` stays `>=20.9`
- Scripts added: `typecheck` (`next typegen && tsc --noEmit`, so route types like `LayoutProps` exist on a clean clone), `test` (`vitest run --passWithNoTests`), `test:e2e` (`playwright test`)
- Vitest alias `@` → `src` configured in `vitest.config.mts` (no extra plugin)
- Scaffold `AGENTS.md` (Next.js agent rules block, auto-managed by `next dev`) kept as-is for now
- `.gitignore`: `!.env.example` re-included; Playwright output dirs ignored
- Contentful space `5bhwks3skt9x` / `master` / `en-US`: `product` content type published, 11 SVG assets + 12 entries published (8 public, 4 authenticated; `bubble-bath-whale` deliberately has no image)
- Product art: hand-written SVGs in `public/products/<slug>.svg` are the single source; uploaded to Contentful byte-identical (verified by CDN download + cmp)
- `npm run snapshot:contentful` regenerates `src/data/products.mock.json` (reads `.env.local`)
- Playwright browsers not installed yet; config + `npx playwright install chromium` deferred to when e2e tests are written
