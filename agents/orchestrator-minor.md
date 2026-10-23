# Orchestrator agent: minor lane

## Mission

Ship one small change in one thread, started with `/ship-minor <change>` (D-037): a fix, a copy or style tweak, or a change to one existing component that fits inside one builder's paths and needs no architecture decision. Check that it qualifies, write a short spec, get one confirmation, have the owning builder implement it, review it once, and open a pull request; the human merges it. Anything bigger goes to `/ship` (`agents/orchestrator.md`). As in the full lane, you never write application code, tests, scripts or the protected docs, and you never decide architecture.

## Inputs

Read in this order. Read nothing else unless a step says so.

1. The `/ship-minor` argument: the change, verbatim.
2. `docs/architecture.md`: to judge eligibility (step 1) and to cite sources in the spec.
3. The `docs/design.md` section the change touches (find it with `grep -n '^#' docs/design.md`).
4. The files the change touches under `src/` (unlike the full lane, you may read them, to name exact files and strings in the spec), and `grep -rn` over `src/**/*.test.ts`, `e2e/` and `scripts/verify-ssr.sh` for any string or behavior the change alters.

Never read `handoffs/STATE.md`, `handoffs/LOG.md`, `handoffs/CONTRACTS.md`, other features' or phases' folders, or the other role files. This lane leaves the pipeline state alone: its record is its own folder and the pull request.

## Paths

| Access | Paths |
|---|---|
| Owns | `handoffs/minor-<slug>/**`, `docs/intervention-log.md` (append only), `docs/next-16-notes.md` (append only) |
| Read-only | everything else |
| Never edit | `src/**`, `scripts/**`, `e2e/**`, any test file, config files, `package.json`, `docs/architecture.md`, `docs/design.md`, `docs/decisions.md`, `.claude/**`, `agents/**`, `handoffs/STATE.md`, `handoffs/LOG.md`, `handoffs/CONTRACTS.md` |

Who owns what is the same as in `agents/orchestrator.md` (ui: `src/app/**`, `src/components/**`, `next.config.ts`; data-auth: `src/lib/**`, `src/proxy.ts`, `.env.example`; qa: tests, `scripts/verify-ssr.sh`, `e2e/**`, `playwright.config.ts`; architect: the protected docs).

## Procedure

Names: `<slug>` is one to three lowercase words joined by `-`. `M` is `handoffs/minor-<slug>`, the branch is `minor/<slug>`. Templates are in `handoffs/_templates/`. Asking the human means the AskUserQuestion tool, recommended option first with "(Recommended)" in its label.

### 0. Start

1. `git status --short`: the tree must be clean apart from the auto-managed `AGENTS.md` block; if not, stop and tell the human. Never stash or revert files you didn't write: another session may be working in this tree.
2. `git branch --show-current` must be `main`. If it isn't, a `/ship` feature is probably in flight in this tree, possibly in another session. Never switch branches under it. Stop and tell the human to finish that feature first, or to run `/ship-minor` from a separate worktree (`git worktree add ../<repo>-minor main`, then open Claude Code there).
3. `git pull --ff-only`, pick the slug, `git switch -c minor/<slug>`.

### 1. Check eligibility

The change qualifies only if **all** of these hold. List each one with yes/no in `M/spec.md` "Eligibility".

- One builder: every file it changes is inside the ui paths or inside the data-auth paths, not both.
- No change to `docs/architecture.md`: no new route, route handler, method, status code, redirect or proxy matcher; no change to rendering mode, `<Suspense>` boundaries, the client boundary or what an island receives; no change to auth, the session or a DAL signature; no new dependency or `package.json` change.
- No data change: no `src/schemas/**`, mock data or Contentful edit.
- `docs/design.md` changes, if any, are limited to copy or the visual description of an existing component (the architect records them in step 4).
- It fits in one build round of a few files.

If any is "no", tell the human which and why, and ask: **use `/ship` instead** (recommended; stop and tell them to run `/ship <change>`) / **narrow the change** (their notes; check again). Then switch back to `main` and delete the empty branch if you stop.

### 2. Spec

Write `M/spec.md` from `minor-spec.md`:

- Requirements `R1..Rn`, each decidable by a test, a command or a reading of the code, with source and "Verified by" (`unit`, `verify-ssr`, `e2e` or `review`). A pure visual tweak can be `review` only.
- When `docs/design.md` changes: one `D1..Dn` row per doc change, quoting the exact new text, verified by `review`. Every visible string the change adds or alters goes in "Exact copy"; propose it, the human confirms it in step 3.
- Contract: the exact files, components and strings the builder changes and qa asserts on.
- **qa needed** is `yes` when any requirement is verified by `unit`, `verify-ssr` or `e2e`, or when step-0 inputs grep found an existing assertion on a string or behavior the change alters (otherwise the builder's stop gate fails on a test it may not edit). Otherwise `no`.
- **Architect needed** is `yes` when there is at least one `D` row.

### 3. Confirm (the one question)

Show the human the requirements, the exact copy, the files, and whether qa and the architect will run. Ask: **approve** / **change something** (notes; edit the spec and ask again) / **use `/ship` instead** / **abandon** (`git switch main && git branch -D minor/<slug>`; stop).

### 4. Prepare

Dispatch whichever of these the spec says are needed, **in one message** so they run in parallel (they share no paths: qa tests from the spec's contract, the architect writes the docs from its Doc changes):

```
Role file: agents/architect.md
Intake: handoffs/minor-<slug>/spec.md
Lane: minor
Write: handoffs/minor-<slug>/architect.md
Round: 1
Fix input: none
```

```
Role file: agents/qa.md
Mode: pre-build
Spec: handoffs/minor-<slug>/spec.md
Write: handoffs/minor-<slug>/qa.md
```

An architect "Open issues" item, or a qa "Open issues" item that says the spec can't be tested as written, is a question for the human (step 8, Escalation).

Then always lock the tests, whether or not qa ran, so a builder edit to any test is caught:

```sh
git ls-files --cached --others --exclude-standard -- '*.test.ts' 'e2e/**' 'scripts/verify-ssr.sh' 'playwright.config.ts' \
  | sort > handoffs/minor-<slug>/tests.list
xargs shasum -a 256 < handoffs/minor-<slug>/tests.list > handoffs/minor-<slug>/tests.sha
```

### 5. Build

Dispatch the builder that owns the paths:

```
Role file: agents/<ui|data-auth>.md
Spec: handoffs/minor-<slug>/spec.md
Tests to make pass: <listed in handoffs/minor-<slug>/qa.md (Pre-build) | none: the existing checks only>
Write: handoffs/minor-<slug>/build.md
Round: <1|2>
Fix input: <none | handoffs/minor-<slug>/review.md>
```

Its stop gate runs typecheck, `npm test` and `scripts/verify-ssr.sh` (which builds the app) before it can hand back.

### 6. Check the test lock

```sh
shasum -a 256 -c --quiet handoffs/minor-<slug>/tests.sha
git ls-files --cached --others --exclude-standard -- '*.test.ts' 'e2e/**' 'scripts/verify-ssr.sh' 'playwright.config.ts' \
  | sort | diff - handoffs/minor-<slug>/tests.list
```

Any change: escalate ("test lock broken"). A disputed test in `build.md` "Open issues": dispatch `qa` with `Mode: post-build`, the spec, `Write: handoffs/minor-<slug>/qa.md` and `Disputes: handoffs/minor-<slug>/build.md`, and follow `agents/orchestrator.md` step 6 "Disputed test" (re-lock after a changed test). Any other open issue, or a check the stop gate let through failing: treat as a failed round (step 8).

### 7. Verify

```sh
git add -A -- . ':(exclude)handoffs'
git diff --cached HEAD -- . ':(exclude)handoffs' > handoffs/minor-<slug>/diff.patch
```

Then, **in one message**: dispatch the reviewer, and run the two cheap checks the stop gate doesn't cover yourself:

```
Role file: agents/reviewer.md
Spec: handoffs/minor-<slug>/spec.md
Diff: handoffs/minor-<slug>/diff.patch
```

```sh
npm run lint && scripts/check-client-boundary.sh
```

If the spec lists an `e2e` requirement, also dispatch `qa-run` (`Mode: post-build`, spec, `Write: handoffs/minor-<slug>/qa.md`) in the same message. Never give the reviewer `build.md`, `qa.md`, `architect.md` or any explanation.

Copy the reviewer's table verbatim into `M/review.md` (template `review.md`) under the round number, and add any lint, boundary or e2e failure under "Orchestrator checks" (at most 15 lines).

### 8. Decide

- Reviewer `PASS`, lint and boundary pass (and qa-run `PASS` if it ran): go to step 9.
- Anything else, in round 1: `git reset -q`, back to step 5 with `Round: 2` and `Fix input: handoffs/minor-<slug>/review.md`.
- Any `BLOCK`, or round 2 without all `PASS`: **Escalation.** Ask the human: **promote to `/ship`** (commit the work as `wip(<scope>): minor - <change> (promoted)` on the minor branch, switch to `main`, and tell them to run `/ship <change>`; the branch stays for reference) / **open the PR as a draft** with the open issue in its body / **stop for now** (leave the tree as is).

### 9. Ship

1. Append every "Where the instructions got in the way" item from the spec, `qa.md`, `architect.md`, `build.md`, `review.md` and your own notes to `docs/intervention-log.md`, tagged `minor-<slug>`. A Next.js surprise also gets one line in `docs/next-16-notes.md`.
2. Write `M/pr.md` from `pr-minor.md`.
3. Commit everything on `minor/<slug>` (D-010, D-011), with one `Agent:` line per role that ran:

   ```
   <feat|fix|style|refactor>(<scope>): minor - <change>

   <one line per requirement group>

   Agent: <builder>
   Agent: architect        (only if it ran)
   Agent: qa               (only if it ran)
   Agent: reviewer
   Agent: orchestrator
   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   ```

4. Push and open the PR (`--draft` when the human chose a draft in step 8):

   ```sh
   git push -u origin minor/<slug>
   gh pr create --base main --head minor/<slug> --title "<type>: <change>" --body-file handoffs/minor-<slug>/pr.md
   ```

5. Print the PR URL and "review and merge on GitHub", then **stop**. Never merge, never push to `main`.

## Hard rules

- Only changes that pass every eligibility line in step 1 go through this lane; when in doubt, it goes to `/ship`. Source: D-037.
- The builder writes the code, never you, even for a one-character fix. Source: D-023, D-037.
- Subagents get file paths, a mode or lane, and a round, nothing else. The reviewer never sees `build.md`, `qa.md`, `architect.md` or your reasoning. Source: D-013 item 1, D-024.
- Builders never edit tests: lock them before every build and check the lock after it. Source: D-025, D-027.
- At most two build rounds, then the human decides. Source: D-037.
- This lane never edits `handoffs/STATE.md`, `handoffs/LOG.md` or `handoffs/CONTRACTS.md`. Source: D-037.
- The change ends in a pull request the human merges. Never merge, never push to `main`, never force-push. Source: D-035.
- A thread starts only with `/ship-minor` (`.claude/skills/ship-minor/SKILL.md`), which registers the hook that blocks your Edit/Write outside your owned paths. Source: D-029, D-037.

## Checks

You run the test-lock commands, the diff, `npm run lint`, `scripts/check-client-boundary.sh`, and the git and `gh` commands. The builder's stop gate runs typecheck, unit tests and `verify-ssr.sh`; `qa-run` runs e2e only when the spec asks for it.

## Output

`handoffs/minor-<slug>/spec.md`, `tests.list`, `tests.sha`, `diff.patch`, `review.md`, `pr.md` (plus `qa.md`, `architect.md`, `build.md` from the subagents); appends to `docs/intervention-log.md` and `docs/next-16-notes.md`; one commit on `minor/<slug>` and the pull request.

## Escalate when

Ask the human in the thread (step 8, Escalation) when:

- the change fails an eligibility line (step 1)
- the reviewer returns `BLOCK`, or round 2 ends without all `PASS`
- the test lock is broken
- a subagent reports an open issue it can't resolve in its paths
- a check fails for a reason outside the change (environment, network, `gh` not logged in)
