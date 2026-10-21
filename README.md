# Tiny Confetti: a Next.js + Contentful toy catalog built by a Markdown agent team

A small product catalog with simulated login, members-only products and member pricing, all rendered on the server. The app was built by a team of specialised AI agents defined in Markdown (`/agents/`), run phase by phase with Claude Code.

- **Live app:** https://nextjs-contentful-demo.vercel.app
- **Demo login:** any username and any password
- **How the agents work, and what went wrong:** [AGENT.md](AGENT.md)

## Features

- **Simulated auth.** Any non-empty username and password signs you in. The server sets a signed, `httpOnly` session cookie (jose HS256) and uses it to protect routes.
- **Role-based content and pricing.** Logged out, you see 8 public toys at everyday prices. Signed in, you also see 4 members-only toys, and every toy shows its member price. Visiting a members-only product while logged out redirects to sign-in, then back to the product.
- **Server rendering.** Prices and members-only products are in the initial HTML response, rendered by server components. Client code is limited to one layout-toggle island that never receives prices or session data.
- **Two layouts.** "Price first" and "Specs first", switched without a page reload and kept in the URL.
- **Filtering.** Category chips, text search and Clear filters, all done on the server from URL parameters.
- **Error handling.** Placeholder art for a missing image, an empty state for no results, and a 404 page for an unknown product.
- **Loading states.** Layout-matched skeletons while session-dependent content streams in, with no layout shift.

## Run locally

Requires Node 24 (`.nvmrc`; Next.js 16 needs at least 20.9).

```bash
npm install
cp .env.example .env.local
# Set SESSION_SECRET in .env.local (32+ characters), for example:
#   openssl rand -base64 32
npm run dev
```

Open http://localhost:3000.

### Data source

With the three `CONTENTFUL_*` variables empty, the app uses the mock data in `src/data/products.mock.json`, so a fresh clone works with no CMS account. Set all three to read from the live Contentful space instead. The server logs one line naming the active source.

| Variable | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | yes | 32+ characters; signs the session cookie |
| `CONTENTFUL_SPACE_ID` | no | all three set = live Contentful |
| `CONTENTFUL_ENVIRONMENT` | no | usually `master` |
| `CONTENTFUL_DELIVERY_TOKEN` | no | Content Delivery API token (read-only) |

`npm run snapshot:contentful` regenerates the mock from the live space.

## Checks

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript, including generated route types |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest), 414 tests |
| `scripts/check-client-boundary.sh` | `'use client'` appears only in `src/components/client/` |
| `scripts/verify-ssr.sh` | Builds and starts the app, then checks the raw HTML with curl: prices and members-only products present with a session and absent without one, the 307 for members-only pages, sign-out, and more (495 assertions) |
| `npm run build && npm run test:e2e` | End-to-end tests (Playwright, Chromium), 25 tests, including a layout-shift measurement. Install the browser once with `npx playwright install chromium` |

All checks use the mock data and their own session secret, so they don't depend on `.env.local`.

For a manual pass in the browser, use [docs/manual-qa.md](docs/manual-qa.md).

## Add a feature with the agents

In Claude Code at the repo root, with `gh` logged in:

```
/ship add a wishlist feature
```

The orchestrator asks you the architecture and design questions the feature raises, the architect agent writes your answers into the docs, and the build phases run test-first with a check from you after each one. It ends by opening a pull request for you to merge. Run `/ship` with no argument to resume. Details: [AGENT.md](AGENT.md) section 7.

## Deploy

Deployed on Vercel: https://nextjs-contentful-demo.vercel.app. To deploy your own copy, import the repository, set `SESSION_SECRET` (and the `CONTENTFUL_*` variables for live content), and deploy with the default Next.js settings.

## Repository map

| Path | What it is |
|---|---|
| `src/` | The app: routes in `src/app`, server components in `src/components`, the only client island in `src/components/client`, server-only data and auth in `src/lib` |
| `agents/` | The agent team, one Markdown file per role. Start with `orchestrator.md` |
| `.claude/` | What makes the agents runnable in Claude Code: thin subagent wrappers, path-scoped rules, hooks and the `/ship` command |
| `handoffs/` | The pipeline's working files: one folder per feature (intake, docs review, PR body) and per phase (spec, qa, build, review, human check), the current state, the round log and the escalations |
| `docs/` | Architecture, design spec, decision log, intervention log and the condensed assessment brief |
| `AGENT.md` | The write-up: architecture, prompting strategy, trade-offs and manual interventions |
| `AGENTS.md` | Managed by Next.js (`next dev` rewrites it); tells any coding agent to read the bundled Next.js 16 docs. Not the write-up |
