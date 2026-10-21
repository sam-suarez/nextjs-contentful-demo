# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent opens this file (D-024). Kept short on purpose (D-033): phase scope and contracts as built are in `handoffs/CONTRACTS.md`, the round history is appended to `handoffs/LOG.md`.

## Current

| Field | Value |
|---|---|
| Phase | 04-fix2 sign-out full page load (OI-2, D-034) |
| Status | escalated <!-- not started / spec / build / review / done / escalated --> |
| Build round | 0 (escalated before spec) |
| Base commit | d0f86d6 |
| Next step | Human: apply the D-034 edits to `docs/decisions.md`, `docs/architecture.md`, `docs/design.md` (drafted in `handoffs/phase-04-fix2/human-check.md`), commit, answer questions A (Origin check) and B (phase split), then `/phase FIXED MANUALLY: …`. Next thread writes the 04-fix2 spec (ui) |
| Open escalation | 04-fix2: the human's D-034 (`POST /logout` route handler, logout action removed) contradicts `docs/architecture.md:17,64`; D-034 is not in `docs/decisions.md`; the fix spans ui and data-auth paths |

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
| 07 suspense skeletons | ui | done (2 rounds used) | `feat(ui): phase 07 - suspense skeletons` (b6b3a9d) |
| 08 release check | qa only | done (all PASS; no fix phases) | `test(release): phase 08 - release check` (a2da463) |
| 04-fix2 sign-out full page load (OI-2) | ui (then data-auth, see question B) | escalated before spec (D-034 not in the docs) | none |

## Human checks

| Phase | Result | Notes |
|---|---|---|
| Part 4 (agent system, 589dd98) | PASSED | Pasted prompt, path guard off (intervention log) |
| 01 auth core (bb5be94) | PASSED | Pasted prompt, path guard off |
| 02 data layer (04e62d2) | PASSED | Pasted prompt, path guard off |
| 03 catalog (06d1f58) | PASSED | via `/phase PASSED` |
| 04 detail + login (wip, escalated) | PASSED (VERIFY.md, 2026-10-21) | OI-1 closed by 04-fix1; see `handoffs/phase-04/human-check.md` |
| 05 layout toggle (f7dff1f) | PASSED (VERIFY.md, 2026-10-21) | see `handoffs/phase-05/human-check.md` |
| 06 release check | PASSED (VERIFY.md, 2026-10-21) | see `handoffs/phase-06/human-check.md` |
| 04-fix1 proxy redirect | FAILED (2026-10-21) | hidden DOM after sign-out (OI-2); OI-2 = option 2 (D-034) → `phase-04-fix2` |
| 07 suspense skeletons | PASSED (VERIFY.md, 2026-10-21) | layout changes: accept all |
| 08 release check | PASSED (VERIFY.md, 2026-10-21) | see `handoffs/phase-08/human-check.md` |
| Decision numbering (Step A) | kept D-031/D-032 (2026-10-21) | |
