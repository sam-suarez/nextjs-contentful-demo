# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent opens this file (D-024). Kept short on purpose (D-033): phase scope and contracts as built are in `handoffs/CONTRACTS.md`, the round history is appended to `handoffs/LOG.md`.

## Current

| Field | Value |
|---|---|
| Phase | 08 release check |
| Status | spec <!-- not started / spec / build / review / done / escalated --> |
| Build round | 0 (qa only) |
| Base commit | 5f15cd8 |
| Next step | 1 (spec) for phase 08, same thread (D-026 suspended by the human) |
| Open escalation | none blocking (OI-2 non-blocking). Batch-run thread 2: 07 closed; still to do: 08 release check → `handoffs/VERIFY.md` |

## Phase plan

Run in order, one phase per thread, each ending at the human gate (D-026). Exception: the batch-run thread (04 round 3 → 05 → 06) suspended D-026 at the human's instruction.

| Phase | Builder | Status | Commit |
|---|---|---|---|
| 01 auth core | data-auth | done (2 rounds used) | `feat(auth): phase 01 - auth core` |
| 02 data layer | data-auth | done (1 round used) | `feat(data): phase 02 - data layer` |
| 03 catalog | ui | done (2 rounds used) | `feat(catalog): phase 03 - catalog` |
| 04 detail + login | ui | escalated (3 rounds used; OI-1, R17) | `wip(detail): phase 04 - detail + login (escalated: …)` |
| 05 layout toggle | ui | done (1 round used) | `feat(layout): phase 05 - layout toggle` |
| 06 release check | qa only | done (all PASS except R17/OI-1; no fix phases) | `test(release): phase 06 - release check` |
| 04-fix1 proxy redirect (OI-1) | data-auth | done (1 round used; 1 dispute) | `feat(auth): phase 04-fix1 - proxy redirect for members-only slugs` (5f15cd8) |
| 07 suspense skeletons | ui | done (2 rounds used) | `feat(ui): phase 07 - suspense skeletons` |
| 08 release check | qa only | spec |  |

## Human checks

| Phase | Result | Notes |
|---|---|---|
| Part 4 (agent system, 589dd98) | PASSED | Pasted prompt, path guard off (intervention log) |
| 01 auth core (bb5be94) | PASSED | Pasted prompt, path guard off |
| 02 data layer (04e62d2) | PASSED | Pasted prompt, path guard off |
| 03 catalog (06d1f58) | PASSED | via `/phase PASSED` |
| 04 detail + login (wip, escalated) | DEFERRED (batch run) | OI-1 open; see `handoffs/phase-04/human-check.md` |
| 05 layout toggle (f7dff1f) | DEFERRED (batch run) | see `handoffs/phase-05/human-check.md` |
| 06 release check | DEFERRED (batch run) | see `handoffs/phase-06/human-check.md` |
| 04-fix1 proxy redirect | DEFERRED (batch run) | see `handoffs/phase-04-fix1/human-check.md`; OI-2 open (non-blocking) |
| 07 suspense skeletons | DEFERRED (batch run) | see `handoffs/phase-07/human-check.md`; 5 visible layout changes need sign-off |
