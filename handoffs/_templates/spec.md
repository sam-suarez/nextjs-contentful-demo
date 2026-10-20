# Phase NN: <name>

**Builder:** <data-auth | ui>  ·  **Depends on:** <phase-NN commits, or none>  ·  **Written by:** orchestrator

## Goal

<One or two sentences: what exists after this phase that didn't before.>

## Requirements

Each one is decidable by a test, a command or a reading of the diff.

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | <observable behavior> | <architecture.md section / D-xxx> | unit / verify-ssr / e2e / review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Contract

Exact names qa tests against and later phases call. Nothing here is optional.

```ts
// <module path>
export function <name>(<args>): <return type>
```

- <cookie names, URL formats, rendered text such as the price format ("$12.99"), redirect targets>

### Contract decisions

Choices architecture.md leaves open, made by the orchestrator for this phase:

- <choice> (why)

## Owned paths

| Role | May change |
|------|------------|
| <builder> | <globs, narrowed to this phase> |
| qa | <test files / scripts for this phase> |

`package.json` changes allowed: <none | exact change>.

## Checks

```sh
npm run typecheck
npm run lint
npm test
scripts/check-client-boundary.sh
npm run build
<phase-specific>
```

## Out of scope

- <things a builder might be tempted to add; they belong to a later phase or nowhere>

## Where the instructions got in the way

<Orchestrator: anything in architecture.md, STATE.md or the agent files that made this spec hard to write, or "none".>
