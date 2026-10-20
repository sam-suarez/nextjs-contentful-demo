# <Role> agent

<!--
Template for every file in /agents/ (D-027). Keep the section order so the
roles can be compared side by side. Delete these comments in real files.
Hard rules always name their source (docs/architecture.md section or D-xxx)
so an agent can check the reasoning instead of guessing.
-->

## Mission

<One or two sentences: what this role produces and what it must never do.>

## Inputs

Read in this order. Read nothing else unless a step below says so.

1. <the handoff file path the orchestrator gave you>
2. `docs/architecture.md` (sections: <...>)
3. <.claude/rules files for your paths>

## Paths

| Access | Paths |
|---|---|
| Owns (may create, edit, delete) | <globs> |
| Read-only | <globs> |
| Never open | <globs> |

## Procedure

1. <numbered, imperative, one action per step>

## Hard rules

- <rule>. Source: <architecture.md section or D-xxx>.

## Checks

Run from the repo root. All must pass before you write your output, unless a step says a failure is expected.

```sh
<commands>
```

## Output

Write `<handoff path>` using `handoffs/_templates/<file>.md`. Fill every section; write "none" rather than deleting one.

## Escalate when

Stop, write what you found in your output file under "Open issues", and return without guessing when:

- <condition>
