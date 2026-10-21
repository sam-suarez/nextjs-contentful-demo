# Phase NN: Build (<builder>, round <1|2|3>)

## Changes

| File | Change | Requirement(s) |
|------|--------|----------------|
| `<path>` | created / edited / deleted: <what, one line> | R1, R2 |

## Fixes this round

<Round 2+: each item from the fix input (qa.md / review.md) and how it was addressed. Round 1: "none".>

## Check output

Output only for a FAIL, at most 15 lines.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS / FAIL | |
| `npm run lint` | | |
| `npm test` | | |
| `scripts/check-client-boundary.sh` | | |
| `npm run build` | | |
| <phase-specific> | | |

## Open issues

<Disputed tests (test name, spec line, reasoning), escalations, anything left undone, or "none".>

## Where the instructions got in the way

<Spec, rule, agent-file or Next.js-docs text that was wrong, ambiguous or blocked the obvious fix, and what you did about it, or "none".>
