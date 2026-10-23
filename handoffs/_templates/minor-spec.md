# Minor: <change>

**Lane:** minor (D-037)  ·  **Builder:** <ui | data-auth>  ·  **Branch:** `minor/<slug>`  ·  **Written by:** orchestrator

**Read:** architecture.md <sections>; design.md <sections, or none>. Builder and reviewer read only these (D-033).

## Request

> <the /ship-minor argument, verbatim>

## Eligibility

Every line must be "yes" (`agents/orchestrator-minor.md` step 1).

| Check | Yes / no |
|-------|----------|
| One builder's paths only | |
| No `docs/architecture.md` change (routes, rendering, boundaries, auth, DAL, dependencies) | |
| No schema, mock or Contentful change | |
| `docs/design.md` changes limited to copy or an existing component's look | |
| Fits in one build round of a few files | |

## Requirements

| ID | Requirement | Source | Verified by |
|----|-------------|--------|-------------|
| R1 | <observable behavior> | <architecture.md / design.md section> | unit / verify-ssr / e2e / review |
| D1 | `docs/design.md` <section> reads: "<exact new text>" (architect) | this spec, Exact copy | review |

The reviewer also checks the global requirements G1 to G6 (`agents/reviewer.md`).

## Exact copy

Confirmed by the human in step 3. qa's checks and the builder use it verbatim.

| Where | Old text | New text |
|-------|----------|----------|
| <component / state> | `<old, or "new">` | `<new>` |

## Contract

- Files the builder changes: <paths>
- Components / exports touched: <names, unchanged signatures unless listed>
- Expected values qa asserts on: <strings, counts, slugs>

## Doc changes

For the architect (lane: minor). Only the `D` rows above; no decisions.md row, no other doc.

- `docs/design.md`: <section>: <change> (D1) / none

## Owned paths

| Role | May change |
|------|------------|
| <builder> | <exact files> |
| architect | `docs/design.md` <section> / none |
| qa | <test files> / none |

`package.json` changes allowed: none.

## Run

- **qa needed:** yes / no (<why: requirement verified by unit/verify-ssr/e2e, or existing assertion at `<file:line>`>)
- **Architect needed:** yes / no
- **Checks:** builder stop gate (typecheck, `npm test`, `scripts/verify-ssr.sh`); orchestrator (`npm run lint`, `scripts/check-client-boundary.sh`); e2e: no / yes (`qa-run`)

## Out of scope

- <anything a builder might be tempted to add>

## Where the instructions got in the way

<Orchestrator: anything that made this spec hard to write, or "none".>
