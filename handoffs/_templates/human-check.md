# Phase NN: Human check

**Status:** closed (commit `<sha>`) | escalated (not committed)
**Result:** <filled in by the orchestrator at the start of the next thread: PASSED / FAILED: notes / FIXED MANUALLY: notes>

## Escalation

<Only when escalated: the exact question or conflict, with file:line and the options. Otherwise "none".>

## Verify it yourself (about 10 minutes)

Run from the repo root.

1. `<command>`. Expect: `<output>`.
2. Browser: `<url>`. Expect: <what you see>.
3. JS disabled (DevTools → Command menu → "Disable JavaScript"): `<url>`. Expect: <same content, prices visible>.
4. View source (`view-source:<url>`): search for `<text>`. Expect: <present/absent>.

## Continue in a new thread

In a fresh Claude Code session at the repo root, run `/phase <result>` (for example `/phase PASSED`). Or paste the prompt below, after filling in its `Human check:` line. `/phase` also turns on the orchestrator's path guard (D-029).

```
You are the orchestrator. Follow agents/orchestrator.md exactly.
Read handoffs/STATE.md first.
Last completed: Phase NN <name> (commit <sha>).
Human check for phase NN: <PASSED | FAILED: what you saw | FIXED MANUALLY: what you changed, commit sha>
Next: Phase <NN+1> <name>, builder <role>.
```
