# Assessment summary (condensed from docs/assessment.pdf)

Motorola Solutions Web Development Team. Full Stack Web Developer technical assessment.
Graded on: architecting an LLM pipeline, managing agentic state, enforcing strict coding requirements via Markdown agent instructions. Not on hand-typed boilerplate.

## Part 1: App spec (what the agents must build)
Stack: Next.js, Contentful (or mocked CMS JSON), TypeScript, Tailwind CSS.

1. **Simulated auth**: full-stack login flow; accept any non-empty input (no DB). Server must *securely* set a session/cookie and use it to protect routes.
2. **Role-based content & pricing**: two product card sets. Set A = public, Set B = authenticated only. Every product has `priceLoggedOut` and `priceAuthenticated`.
3. **Rendering**: pricing and role-based content must be SSR/SSG in the initial HTML, not client-only.
4. **Display mapping**: 2+ layouts (e.g. "Price First", "Specs First"); switchable via UI control without page reload.
5. **Filtering**: by category, text search, and a "Clear Filters" button.
6. **Error handling**: graceful fallbacks for missing product images, empty search results, invalid slugs.

## Part 2: Core task (the Markdown agent system)
- Team of specialized AI agents defined **entirely in Markdown** (system prompts / personas / chained instructions) that direct an AI assistant (Copilot, Cursor, ChatGPT, etc.) to build the app.
- Full autonomy on number of agents, handoffs, division of labor.
- **No monolithic "write the whole app" prompt**: specialized roles, discrete steps.
- Agent definitions in a dedicated dir (e.g. `/agents/` or `/prompts/`) so reviewers can see prompting strategy and system boundaries.
- Contentful fetch layer may be mocked with a hardcoded JSON seed file.

## Deliverables
- **One repo**: Next.js app + `/agents/` Markdown files.
- **README.md**: local setup instructions; deployment URL (Vercel/Netlify).
- **AGENT.md**:
  - Architecture explanation: why these agents/prompts; how context and handoffs were managed.
  - Prompting strategy: how SSR vs client-side (and other arch requirements) were enforced via Markdown.
  - Trade-offs & manual intervention: manual fixes needed to compile/deploy; where AI struggled; what you'd improve with two more weeks.

## Submission
Email jeffrey.masterson@motorolasolutions.com, subject "Full Stack Developer Assessment - [Your Name]".
Body: Repo URL, Live App URL, Demo Login (credentials if needed).
Questions allowed within 24h of receiving the assignment.
