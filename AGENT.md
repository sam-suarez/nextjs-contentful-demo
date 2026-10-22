# AGENT.md: how this app was built by a Markdown agent team

This app was not written as one big prompt. A team of five specialised agents, each defined in a Markdown file under `/agents/`, built it in ten phases: eight planned, plus two fix phases. Every phase left a paper trail in `handoffs/`. This file explains how the team is set up, how its context and handoffs work, how the architecture rules were enforced, and where it struggled and needed a human.

Decision IDs (`D-0xx`) point to [docs/decisions.md](docs/decisions.md). The raw record behind this summary is in [docs/intervention-log.md](docs/intervention-log.md), [handoffs/LOG.md](handoffs/LOG.md) and [handoffs/ESCALATIONS.md](handoffs/ESCALATIONS.md).

## 1. The agent team

| Agent | Owns (may write) | Job |
|---|---|---|
| **orchestrator** ([agents/orchestrator.md](agents/orchestrator.md)) | `handoffs/**` | Writes each phase spec from the architecture, dispatches the other agents with file paths only, enforces the gates, commits, and stops at the human check. Never writes app code or tests |
| **qa** ([agents/qa.md](agents/qa.md)) | `**/*.test.ts`, `scripts/verify-ssr.sh`, `e2e/**`, `playwright.config.ts` | Writes failing tests from the spec **before** the build, then runs every check after it |
| **data-auth** ([agents/data-auth.md](agents/data-auth.md)) | `src/lib/**`, `src/proxy.ts`, `.env.example` | Session, login, the data access layer, the Contentful and mock adapters, filtering |
| **ui** ([agents/ui.md](agents/ui.md)) | `src/app/**`, `src/components/**`, `next.config.ts` | Routes and components, with prices and members-only content rendered on the server |
| **reviewer** ([agents/reviewer.md](agents/reviewer.md)) | nothing | Context-blind and read-only. Judges the diff against the spec and returns PASS, REVISE or BLOCK per requirement |
| **architect** ([agents/architect.md](agents/architect.md)), *added after the build (D-035)* | `docs/architecture.md`, `docs/design.md`, `docs/decisions.md`, `.claude/rules/`, `src/schemas/`, `src/data/` | Writes the human's recorded decisions for a new feature into the docs. Transcribes, never decides. See section 7 |

**Why these five (D-023).** Ownership follows the code's natural boundaries: the server-only layer, the rendering layer and the tests. Each agent gets exactly the rules for its paths, and no two agents edit the same file. Three roles (builder, tester, reviewer) would drift back to one monolithic builder, which the brief rules out. Seven or more would add handoffs and cold starts for areas of a handful of files. The orchestrator is the main Claude Code session rather than a subagent, because subagents can't start subagents.

**Why tests come first (D-025).** qa writes tests from the spec alone, before any code exists, and the builders may not edit them. The tests encode the requirement, not the implementation, and give the builder an objective "done" signal. A test the builder thinks is wrong goes back through the orchestrator as a dispute; qa decides it.

**Why a context-blind reviewer (D-013, D-024).** The reviewer sees the spec and the diff, and may read the current source tree. It never sees the builder's notes, qa's report or the pipeline state, so it can't be talked into a PASS by the builder's explanation. Its tool list is `Read, Grep` only, so "read-only" is a capability limit, not a request.

All role files share one template ([agents/_template.md](agents/_template.md)): Mission, Inputs, Paths (owns, read-only, never), Procedure, Hard rules with their source, Checks, Output and Escalate when. That makes the system boundaries readable side by side (D-027). `.claude/agents/*.md` are thin wrappers (frontmatter plus "follow `/agents/X.md`") so `/agents/` stays the single source of truth (D-007).

## 2. Context and handoffs

**Everything goes through files (D-024).** Each phase gets a folder, for example [handoffs/phase-03/](handoffs/phase-03/):

| File | Written by | Read by |
|---|---|---|
| `spec.md` | orchestrator | everyone: numbered requirements `R1..Rn`, each with its source and how it is verified, plus the exact contract (module paths, exports, data values) qa tests against |
| `qa.md` | qa | orchestrator, builder: pre-build test list, post-build results, disputes |
| `build.md` | builder | orchestrator, qa: what changed, check output, disputed tests, and "where the instructions got in the way" |
| `review.md` | orchestrator (the reviewer's verdicts, verbatim) | builder on a REVISE |
| `human-check.md` | orchestrator | the human: what to verify, and the result |

The orchestrator passes agents **paths, not content**, so each subagent starts with a small, predictable context. Pipeline state lives in [handoffs/STATE.md](handoffs/STATE.md) (current state only), [handoffs/CONTRACTS.md](handoffs/CONTRACTS.md) (each phase's contract as built, for the phases that depend on it) and [handoffs/LOG.md](handoffs/LOG.md) (append-only round history).

**One phase per thread, with a human gate (D-026).** Each phase ends with a commit and a `human-check.md`, then the thread stops. A fresh thread starts the next phase with `/phase PASSED` (or `FAILED: …`). This keeps each orchestrator context small and proves the files alone are enough to resume. The build ran across about ten threads with no shared memory beyond the repo. After the build, `/phase` was replaced by `/ship` (section 7).

**Bounded rounds.** A REVISE goes back to the builder at most twice. A BLOCK, or a third failed round, stops the phase and escalates to the human with options. The pipeline never quietly lowers the bar to get green.

**Trimming for cost (D-033).** After phase 07, a measurement showed a one-round phase read about 180K tokens of inputs before doing any work, about 45K of it bundled Next.js docs per builder dispatch. The workflow was trimmed: [docs/next-16-notes.md](docs/next-16-notes.md) replaced the doc reading lists, each spec names the exact doc sections to read, qa post-build and review run in parallel, routine check runs use a cheaper model (`qa-run`), and handoff output is capped.

## 3. Prompting strategy: enforcing the architecture

The hardest requirement is "prices and role-based content are in the initial HTML, not client-only". It is enforced in layers, so no single prompt has to carry it.

1. **One source of truth.** [docs/architecture.md](docs/architecture.md) states the rules; [docs/design.md](docs/design.md) states layout and exact copy. Agents may not edit either. Every hard rule in a role file cites its source.
2. **Path-scoped rules.** [.claude/rules/](.claude/rules/) loads short rules by path: `src/app/**` and `src/components/**` get the SSR rules, `src/components/client/**` gets the island rules (no prices, no session data, no `src/lib` imports), `src/lib/**` gets `import "server-only"`, and tests get the test rules.
3. **Structure that makes the wrong thing hard.** `'use client'` is allowed only in `src/components/client/` (D-022). Only `src/lib/**` may read cookies or call Contentful, and every file there starts with `import "server-only"`. Logged-out requests only ever receive public products, because the data layer filters by visibility before anything reaches a page (D-014, D-017).
4. **Checks that prove it from the outside.** `scripts/verify-ssr.sh` builds the app, fetches pages with curl and asserts **both directions** on the raw HTML: member prices and members-only names present with a session and absent without one, everyday prices present when logged out. `scripts/check-client-boundary.sh` proves no `'use client'` escaped its folder.
5. **Hooks, not trust (D-029).** [.claude/settings.json](.claude/settings.json) registers three hooks: a path guard that blocks writes outside an agent's owned paths (and reviewer reads outside its inputs), a type check after every edit, and a stop gate that sends a builder back when the type check, unit tests or `verify-ssr.sh` fail (once; the second time it lets the builder through so it can escalate instead of looping). Builders also can't touch tests: the orchestrator records a checksum of qa's files before the build and re-checks it after (D-027).
6. **Exact contracts.** Specs copy every string the checks depend on from design.md (labels, banner text, counts), and give module paths and signatures, so qa and the builder can't drift apart.

## 4. Where the AI struggled, and what the human decided

### Two escalations

Both are written up in [handoffs/ESCALATIONS.md](handoffs/ESCALATIONS.md).

**OI-1: signing in from a members-only link landed on the catalog (phase 04).** qa's test caught it before any human did. The ui agent tried three rounds within its rules, then traced the cause into Next.js internals. The detail route built as a partial prerender, so its redirect ran in the browser, and Next's hidden `<Activity>` cache replayed it after sign-in. The architecture's assumption that `instant = false` forces full server rendering turned out to be wrong for Next 16. The pipeline stopped with four options instead of hacking around its own rules. **Decision:** a real 307 from the proxy for members-only pages (D-032), and adopting Next's documented pattern of `<Suspense>` with layout-matched skeletons (D-031). Fixed in `phase-04-fix1`; skeletons in phase 07.

**OI-2: after sign-out, the members-only page stayed hidden in the DOM (phase 04-fix1).** Found by data-auth and qa, then my manual check failed the phase on it. Nothing new reached a logged-out visitor, but the previous page was still in the tab, findable with DevTools. **Decision:** sign out became a plain form POST to a `/logout` route handler answering 303, so the browser does a full page load, with an `Origin` check to stop cross-site sign-out (D-034). Fixed in `phase-04-fix2`.

### Recurring trouble

- **A brand-new framework.** Next.js 16 changed APIs the model knows from older versions. Agents were told to read the bundled docs, and still hit gaps the docs don't cover: a proxy test helper with a different name, `<Activity>` replaying redirects, and `request.url` always being `localhost` under `next start` (qa caught that one before the build).
- **Literal reading.** Early reviews returned REVISE on requirements that only a command can verify ("insufficient evidence in the diff"), or on test files the builder wasn't allowed to touch. Fixed by letting the reviewer read the current code and leave command results to qa (D-033).
- **Tests have bugs too.** qa wrote two wrong tests: an exact-count price check that React's hydration payload always doubles, and a URL regex without a start anchor. The dispute route handled both without weakening any server-output assertion.
- **The procedure's own gaps.** No step for an interrupted subagent, a phase with no builder, or a fix that spans two builders. Each was handled by hand and logged as an "instructions got in the way" item.

### Manual interventions

After the pipeline started, application code changed outside it exactly once: a UI polish commit after the deploy (last row below). Every other commit touching `src/` is an agent phase commit (`Agent:` trailers, D-011). The other human interventions were decisions and process changes:

| When | Intervention |
|---|---|
| Parts 1–4 | Setup, data model, Contentful content, architecture and the agent system itself, built in a plain session (commits marked `Agent: manual`) |
| Phase 01 | Decided a reviewer finding whose fix was in qa's locked test files |
| Phase 04 | Approved an extra build round to test a hypothesis; then accepted a client-side redirect; then, after the auto-mode permission classifier blocked qa from removing 12 server checks, had the orchestrator remove them by hand. The proxy fix for OI-1 brought back the real 307 and its checks; the 404 status for unknown slugs stayed client-side (see Trade-offs) |
| Phases 04–08 | Suspended "one phase per thread" for three threads to move faster, deferring the human checks to one batch check |
| OI-1, OI-2 | The architecture decisions above (D-031, D-032, D-034), plus accepting phase 07's layout changes |
| After phase 07 | The token and speed optimisation of the workflow (D-033) |
| 04-fix2 | Committed the D-034 doc edits myself, after the classifier refused to let the orchestrator commit protected docs it had edited via a shell |
| After deploy | One UI commit outside the pipeline, in a plain session (`6dc6878`, `Agent: manual`): a one-row mobile header and a "Member price applied" note in the detail price card, replacing two phase 07 layout trade-offs. No test changed; every check still passes (see Trade-offs) |

## 5. Trade-offs

- **Process over speed.** Ten phases with test-first, review and a human gate is slow for an app this size. It was chosen because the brief grades the pipeline, and because it caught both real bugs before a human did.
- **Batching human checks.** Running several phases per thread saved time, but it was also where the pipeline ran with its path guard off (threads started from a pasted prompt instead of `/phase`), and where the OI-2 check waited longest. A thread can now only start from `/ship` (section 7), which registers the guard.
- **No-JS rendering dropped for streamed content (D-031).** Prices are still in the initial HTML response, but a visitor without JavaScript sees the skeleton where streamed content would be. Accepted in exchange for following Next's documented pattern.
- **Layout shift vs design fidelity.** To keep the skeleton swap shift-free, some components reserve space so both session states are the same size. Phase 07 first did this with an empty row under the member price and a second header row on mobile. After deploying, I replaced both outside the pipeline (`6dc6878`, section 4): members now see a "Member price applied" note in that space, and the mobile header is one row with a member initial in place of the badge and name.
- **Unknown slugs answer 200 with `noindex`,** not a 404 status, because the not-found branch runs in a streamed segment. The page and the `noindex` are correct; the status code is not.
- **Credentials pick the data source (D-021).** Zero setup for a fresh clone, at the cost that a deploy missing the Contentful variables silently serves mock data (mitigated by the log line).

## 6. With two more weeks

1. **Prototype the riskiest route before writing the architecture.** OI-1 came from one wrong assumption about the framework. A one-hour probe build of the detail route would have caught it before phase 04.
2. **Close the path guard's shell gap.** The guard covers Edit and Write but not writes through Bash. Today the reviewer and the test checksum are the backstop.
3. **Let the human's decision reach the protected docs.** Every architecture change cost an extra thread, because no agent may edit architecture.md. A small "architect" step that applies a recorded human decision, with its own review, would fix that. **Done after the build: `/ship` and the architect agent (section 7, D-035).**
4. **Allow more than one builder per phase**, with an explicit handoff between them. Fix phases kept needing it.
5. **CI and deployment.** Run the same checks in GitHub Actions on every push, and deploy previews on Vercel.
6. **Real 404 status for unknown slugs,** probably via the proxy or `generateStaticParams`, and visual regression tests for the two layouts.

## 7. After the build: `/ship` replaces `/phase` (D-035)

`/phase PASSED` worked for a planned build: each thread opened with the human's verdict on the previous phase. It read badly for new work after the plan had finished, and every architecture change still needed the human to edit the protected docs by hand. New work now starts with one command:

```
/ship add a wishlist feature
```

1. **Interview.** The orchestrator reads the architecture and design docs, works out what the feature needs that they don't settle (storage, who sees it, rendering and the client boundary, routes, data model, exact copy), and asks the human, with a recommended option first. It writes the answers to `handoffs/feature-<slug>/intake.md`, and the human confirms them.
2. **Architect.** A new agent writes those answers into `docs/architecture.md`, `docs/design.md`, `docs/decisions.md` and the path-scoped rules, plus any schema, mock or Contentful change the intake lists. It transcribes; anything the intake doesn't answer goes back to the human.
3. **Docs review.** The reviewer, in a new docs mode, checks the doc diff against the intake: everything recorded, nothing invented, no hard rule broken by accident. Then the human approves the diff, and it is committed.
4. **Build.** The same phase steps as before (spec, test-first, lock, build, verify, review), several phases in one thread, with the human check asked in the thread.
5. **Pull request.** The feature ends on its own branch, pushed with a PR that the human merges. The next `/ship` asks GitHub whether it was merged, so nothing has to react to the merge, and only merged docs ever reach `main`, where every new feature starts.

The orchestrator still never decides architecture: the human decides, the architect writes it down, the reviewer checks the writing. One feature is in flight at a time. Contentful has no branches and the deployed site reads the same space, so the architect may only make additive changes there, each confirmed by the human as "live before merge".
