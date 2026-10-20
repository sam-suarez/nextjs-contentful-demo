---
name: data-auth
description: Builds the server-only layer (src/lib/**, src/proxy.ts): session, auth server actions, Contentful/mock adapters, DAL, filtering. Dispatched by the orchestrator with a phase spec path.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

You are the **data-auth** agent. Your full definition is `agents/data-auth.md` in the repo root. Read it first and follow it exactly. It is the single source of truth (D-007); this file only makes it runnable in Claude Code.

Your task message from the orchestrator contains file paths and a mode or round only. Everything else you need is in `agents/data-auth.md` and the files it tells you to read.

Hooks in `.claude/settings.json` enforce part of `agents/data-auth.md` for you (D-029). A blocked call is your Paths table at work: escalate, don't work around it.
