# Pipeline state

Owned by the orchestrator (`agents/orchestrator.md`). No other agent opens this file (D-024). Kept short on purpose (D-033): phase scope and contracts as built are in `handoffs/CONTRACTS.md`, the round history is appended to `handoffs/LOG.md`.

## Feature in flight

One at a time (D-035). `/ship <feature>` fills this table; `/ship` with no argument resumes from it. After a PR is opened, the status stays `pr-open` until the next `/ship` looks the PR up with `gh` and records the merge.

| Field | Value |
|---|---|
| Feature | Price sort (sort the catalog by price, ascending and descending) |
| Slug / branch | `price-sort` / `feature/price-sort` |
| Base commit | cbdf068 |
| Status | pr-open <!-- none / interview / docs / build / escalated / pr-open --> |
| Step | C3 <!-- orchestrator step to resume at, e.g. A3, phase 09 step 4, C3 --> |
| Architect round | 1 |

## Features

| Feature | Decision | Phases | Branch | PR | Status |
|---|---|---|---|---|---|
| Member savings line | D-036 | 09, 10 | `feature/member-savings` | #1 | merged (c21a177) |
| Price sort | D-038 | 11, 12 | `feature/price-sort` | #3 | pr-open |

## Current phase

| Field | Value |
|---|---|
| Phase | none: price-sort phases and 12-fix1 done |
| Status | done <!-- not started / spec / build / review / done / escalated --> |
| Build round | 1 |
| Base commit | d22b224 (PR #3 head) |
| Next step | PR #3 review and merge by the human; the next `/ship` records it |
| Open escalation | none. OI-3 resolved by phase 12 amendment A1 |

## Phase plan

Phases 01–08 and the two fix phases were run with `/phase`, one phase per thread, each ending at the human gate (D-026; `/phase` retired by D-035). New phases are added by `/ship` at step A7, numbered from 09, and run in one thread per feature with the human check asked in the thread. From phase 04 round 3 on, the human suspended D-026 for three threads and ran several phases per thread, deferring the human checks to one batch check (intervention log: "Batch run", "Resume thread", "Batch-run thread 2").

| Phase | Builder | Status | Commit |
|---|---|---|---|
| 01 auth core | data-auth | done (2 rounds used) | `feat(auth): phase 01 - auth core` (bb5be94) |
| 02 data layer | data-auth | done (1 round used) | `feat(data): phase 02 - data layer` (04e62d2) |
| 03 catalog | ui | done (2 rounds used) | `feat(catalog): phase 03 - catalog` (06d1f58) |
| 04 detail + login | ui | escalated after 3 rounds (OI-1, R17); resolved by 04-fix1 | `wip(detail): phase 04 - detail + login (escalated: …)` (9c79ec9) |
| 05 layout toggle | ui | done (1 round used) | `feat(layout): phase 05 - layout toggle` (f7dff1f) |
| 06 release check | qa only | done (all PASS except R17/OI-1; no fix phases) | `test(release): phase 06 - release check` (6c2cefa) |
| 04-fix1 proxy redirect (OI-1) | data-auth | done (1 round used; 1 dispute) | `feat(auth): phase 04-fix1 - proxy redirect for members-only slugs` (5f15cd8) |
| 07 suspense skeletons | ui | done (2 rounds used) | `feat(ui): phase 07 - suspense skeletons` (b6b3a9d) |
| 08 release check | qa only | done (all PASS; no fix phases) | `test(release): phase 08 - release check` (a2da463) |
| 04-fix2 sign-out full page load (OI-2) | ui, then data-auth (one phase, human override) | done (1 round used; 1 pre-build amendment) | `feat(auth): phase 04-fix2 - sign-out full page load` (841459a) |
| 09 savings percent (member-savings, D-036) | data-auth | done (1 round used; 1 pre-build amendment) | `feat(data): phase 09 - savings percent` (bb81078) |
| 10 savings line (member-savings, D-036) | ui | done (1 round used; 1 dispute, test changed by qa) | `feat(ui): phase 10 - savings line` (457e87f) |
| 11 price sort helper (price-sort, D-038) | data-auth | done (1 round used) | `feat(data): phase 11 - price sort helper` (7f83272) |
| 12-fix1 pop-in order (PR #3 feedback) | ui | done (1 round used; review G1 diff-assembly REVISE resolved by the orchestrator) | `fix(ui): phase 12-fix1 - pop-in order after a client sort` (99a9ce4) |
| 12 price sort control (price-sort, D-038) | ui | done (1 round used; 1 pre-build amendment, 1 dispute, test changed by qa) | `feat(ui): phase 12 - price sort control` (461cd9c) |

## Human checks

| Phase | Result | Notes |
|---|---|---|
| Part 4 (agent system, 589dd98) | PASSED | Pasted prompt, path guard off (intervention log) |
| 01 auth core (bb5be94) | PASSED | Pasted prompt, path guard off |
| 02 data layer (04e62d2) | PASSED | Pasted prompt, path guard off |
| 03 catalog (06d1f58) | PASSED | via `/phase PASSED` |
| 04 detail + login (wip, escalated) | PASSED (batch check, 2026-10-21) | OI-1 closed by 04-fix1; see `handoffs/phase-04/human-check.md` |
| 05 layout toggle (f7dff1f) | PASSED (batch check, 2026-10-21) | see `handoffs/phase-05/human-check.md` |
| 06 release check | PASSED (batch check, 2026-10-21) | see `handoffs/phase-06/human-check.md` |
| 04-fix1 proxy redirect | FAILED (2026-10-21) | hidden DOM after sign-out (OI-2); OI-2 = option 2 (D-034) → `phase-04-fix2` |
| 07 suspense skeletons | PASSED (batch check, 2026-10-21) | layout changes: accept all |
| 08 release check | PASSED (batch check, 2026-10-21) | see `handoffs/phase-08/human-check.md` |
| Decision numbering (Step A) | kept D-031/D-032 (2026-10-21) | |
| 04-fix2 sign-out full page load (841459a) | PASSED (2026-10-21) | see `handoffs/phase-04-fix2/human-check.md` |
| 09 savings percent (bb81078) | PASSED (2026-10-22) | first ask hid the steps behind the dialog; re-asked with them in the preview (intervention log) |
| 10 savings line (457e87f) | PASSED (2026-10-22) | steps shown in the question preview |
| 11 price sort helper (7f83272) | PASSED (2026-10-23) | steps in the question preview |
| 12-fix1 pop-in order | pending (human asked to push first) | steps in `handoffs/phase-12-fix1/human-check.md` |
| 12 price sort control (461cd9c) | PASSED (2026-10-23) | steps in the question preview; review layout notes (768–900 px wrap, pill fit, mobile tab order) accepted |
