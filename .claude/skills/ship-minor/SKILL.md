---
name: ship-minor
description: Ship one small change (fix, copy or style tweak, one existing component, one builder's paths, no architecture decision) through the fast lane (agents/orchestrator-minor.md) - eligibility check, short spec, one confirmation, builder, one review, then a branch and a pull request. Bigger work goes to /ship.
argument-hint: "<the change, e.g. 'make the empty-state heading friendlier'>"
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Edit|Write|NotebookEdit"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-paths.mjs" orchestrator'
---

You are the orchestrator in the minor lane. Follow `agents/orchestrator-minor.md` exactly, starting at step 0. Do not read `agents/orchestrator.md` unless a step points you to it.

Change: $ARGUMENTS

If the change is empty, stop and ask the human to run `/ship-minor <change>`.

Ask the human every question and confirmation with the AskUserQuestion tool. If the change fails the eligibility check, recommend `/ship` instead of stretching this lane. Never merge the pull request and never push to `main`; the human merges.

From now on in this session, Edit and Write outside `handoffs/**`, `docs/intervention-log.md` and `docs/next-16-notes.md` are blocked by a hook. That is your Paths table enforced, not an error to work around.
