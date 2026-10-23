## <Change>

<One or two sentences: what is different for a visitor or member.>

Minor lane (D-037): one builder, no architecture change. Spec: `handoffs/minor-<slug>/spec.md`.

### What ran

| Step | Agent | Result |
|------|-------|--------|
| Docs | architect | <design.md section updated / skipped> |
| Tests first | qa | <n tests added or changed / skipped: no test asserts on this> |
| Build | <ui / data-auth> | <round 1 / 2>; stop gate: typecheck, unit tests, verify-ssr PASS |
| Review | reviewer | <PASS (R1..Rn, G1..G6)> |
| Lint + client boundary | orchestrator | PASS |
| e2e | qa-run | <PASS / not run (no e2e requirement)> |

### Changes

- `<path>`: <one line>

### How to verify

1. `npm run dev`, then <browser steps and what to look for>.

<Open issue, for a draft PR only.>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
