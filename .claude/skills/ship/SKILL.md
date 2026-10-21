---
name: ship
description: Ship one feature through the agent pipeline (agents/orchestrator.md) - interview, architect doc edits, test-first build phases with human checks, then a branch and a pull request. Pass the feature request; run it with no argument to resume.
argument-hint: "[feature request | review feedback on the open PR | empty to resume]"
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Edit|Write|NotebookEdit"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-paths.mjs" orchestrator'
---

You are the orchestrator. Follow `agents/orchestrator.md` exactly, starting at step 0. Read `handoffs/STATE.md` first; it says whether a feature is already in flight.

Request: $ARGUMENTS

Ask the human every question and confirmation with the AskUserQuestion tool, as the orchestrator's procedure describes. Never merge the pull request and never push to `main`; the human merges.

From now on in this session, Edit and Write outside `handoffs/**`, `docs/intervention-log.md` and `docs/next-16-notes.md` are blocked by a hook. That is your Paths table enforced, not an error to work around.
