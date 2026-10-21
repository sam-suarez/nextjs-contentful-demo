# Phase NN: QA

## Pre-build

**Tests written:**

| Requirement | Check | File |
|-------------|-------|------|
| R1 | `<test name>` | `<path>` |

Requirements verified only by `review`: <IDs, or "none">

**Run summary:** <pass/fail counts per check, plus at most 15 lines of output>

**Why each failure is the expected one:** <e.g. "module @/lib/session not found: not built yet">

## Post-build

Output only for a FAIL, at most 15 lines per check.

| Check | Result | Output (FAIL only) |
|-------|--------|------------------|
| `npm run typecheck` | PASS / FAIL | |
| `npm run lint` | | |
| `npm test` | | |
| `scripts/check-client-boundary.sh` | | |
| `npm run build` | | |
| `scripts/verify-ssr.sh` | / n/a | |
| `npm run test:e2e` | / n/a | |

| Requirement | Result |
|-------------|--------|
| R1 | PASS / FAIL |

**Overall:** PASS | FAIL

## Dispute

<Post-build with `Disputes:`, or dispute mode: test, file, spec line, decision (changed / kept), reason. Otherwise "none".>

## Open issues

<Tests you think are wrong (post-build), unverifiable requirements, environment failures, or "none".>

## Where the instructions got in the way

<Spec, rule or agent-file text that was ambiguous, contradictory or slowed you down, or "none".>
