# Feature: <name>

**Slug:** `<slug>`  ·  **Branch:** `feature/<slug>`  ·  **Decision:** D-0xx  ·  **Written by:** orchestrator, from the human's answers (D-035)

Read by the architect (to edit the docs) and by the reviewer in docs mode (to check them). Only the human's answers count as decisions; the orchestrator's recommendations are marked as such.

## Request

> <the /ship argument, verbatim>

## Decisions

| ID | Question | Answer (the human's) | Recommended option? | Changes |
|----|----------|----------------------|---------------------|---------|
| I1 | <question> | <answer> | yes / no: recommended was <option> | architecture.md <section>; design.md <section> |

## Exact copy

Every visible string the feature adds or changes, verbatim. qa's checks grep for these.

| Where | Text |
|-------|------|
| <component / state> | `<text>` |

## Doc changes

What the architect writes, by file. Each line cites the decisions behind it.

- `docs/architecture.md`: <section>: <change> (I1, I2)
- `docs/design.md`: <section>: <change> (I3)
- `docs/decisions.md`: new row D-0xx; superseded rows: none / D-0yy
- `.claude/rules/`: none / `<file>`: <rule change> (I4)

## Data changes

Contentful has no branches: a change here is live on the deployed site before the PR is merged. Additive only.

| Change | Where | Live before merge | Approved by the human |
|--------|-------|-------------------|------------------------|
| none / <add optional field `x` to `product`> | Contentful / `src/schemas/product.ts` / mock (regenerated) | yes / no | yes / no |

## Build phases

| Phase | Builder | Builds | qa writes first |
|-------|---------|--------|-----------------|
| NN <name> | data-auth / ui | <scope> | <tests> |

## Out of scope

- <item>

## Amendments

<Later human decisions (docs feedback at Confirm 2, escalations during the build), each dated and numbered on from the decisions (I5, I6, …). "none" until there is one.>

## Confirmations

| Step | Result | Date |
|------|--------|------|
| Confirm 1 (decisions) | approved / changed: <notes> | |
| Confirm 2 (docs diff) | approved / changed: <notes> | |
