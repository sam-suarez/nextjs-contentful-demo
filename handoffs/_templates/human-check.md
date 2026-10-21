# Phase NN: Human check

**Status:** closed (commit `<sha>`) | escalated (not committed)
**Result:** <filled in by the orchestrator at the start of the next thread: PASSED / FAILED: notes / FIXED MANUALLY: notes>

## Escalation

<Only when escalated: the exact question or conflict, with file:line and the options. Otherwise "none".>

## Verify it yourself (about 10 minutes)

Run from the repo root.

1. `<command>`. Expect: `<output>`.
2. Browser: `<url>`. Expect: <what you see>.
3. View source (`view-source:<url>`): search for `<text>`. Expect: <present/absent>.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>`, for example `/phase PASSED`, `/phase FAILED: <what you saw>` or `/phase FIXED MANUALLY: <what you changed>, <sha>`. `/phase` is the only entry point: it turns on the orchestrator's path guard (D-029, D-033).
