#!/usr/bin/env node
// PostToolUse (Edit|Write): runs `npm run typecheck` after a TypeScript edit and reports errors to the agent.
// Advisory only (never blocks): in qa's pre-build pass, typecheck fails on purpose because the tests
// import modules the phase has not built yet (D-025). The hard gate is stop-gate.mjs for builders.
// Registered in .claude/settings.json; the role is the subagent's agent_type.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const input = JSON.parse(readFileSync(0, "utf8"));
const role = input.agent_type;
if (!["data-auth", "ui", "qa"].includes(role)) process.exit(0);
const file = input.tool_input?.file_path ?? "";
if (!/\.(ts|tsx|mts|cts)$/.test(file)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const run = spawnSync("npm", ["run", "--silent", "typecheck"], { cwd: root, encoding: "utf8" });
if (run.status === 0) process.exit(0); // silent on success: no tokens spent

const errors = `${run.stdout}${run.stderr}`.split("\n").filter((l) => /error TS\d+/.test(l));
const shown = errors.slice(0, 25).join("\n") || `${run.stdout}${run.stderr}`.trim().slice(-2000);
const more = errors.length > 25 ? `\n… ${errors.length - 25} more` : "";

const note =
  role === "qa"
    ? "Pre-build: 'Cannot find module' (TS2307) or 'has no exported member' (TS2305/TS2614) for modules this phase builds are expected; record them in qa.md. Any other error is a test bug: fix it. Post-build: every error is a FAIL."
    : "Fix errors in your owned paths before you finish. The stop gate re-runs typecheck and sends you back if it fails.";

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `typecheck after edit: ${errors.length || "some"} error(s)\n${shown}${more}\n${note}`,
    },
  }),
);
