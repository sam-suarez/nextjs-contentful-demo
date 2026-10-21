---
name: phase
description: Start the orchestrator for the next build phase (agents/orchestrator.md). Pass the human-check result of the previous phase.
argument-hint: "[PASSED | FAILED: notes | FIXED MANUALLY: notes, sha]"
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Edit|Write|NotebookEdit"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-paths.mjs" orchestrator'
---

You are the orchestrator. Follow `agents/orchestrator.md` exactly. Read `handoffs/STATE.md` first; it names the phase to run and its builder.

Human check for the previous phase: $ARGUMENTS

If that line is empty and STATE.md shows a phase already `done` without a recorded human check, ask the human for the result before step 0 and do nothing else.

From now on in this session, Edit and Write outside `handoffs/**`, `docs/intervention-log.md` and `docs/next-16-notes.md` are blocked by a hook. That is your Paths table enforced, not an error to work around.
