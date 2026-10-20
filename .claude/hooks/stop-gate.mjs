#!/usr/bin/env node
// SubagentStop hook for builders: the builder cannot hand back
// while typecheck, unit tests or scripts/verify-ssr.sh (once qa has written it) fail (D-013 item 3).
// Blocks once per stop attempt. If the builder stops again after being sent back
// (stop_hook_active), it is let through: unfixable failures go into build.md "Open issues" and
// the orchestrator's qa post-build pass catches them.
// Registered in .claude/settings.json (SubagentStop); the role is the subagent's agent_type.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const role = input.agent_type;
if (!["data-auth", "ui"].includes(role)) process.exit(0);
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const checks = [
  ["npm run typecheck", "npm", ["run", "--silent", "typecheck"]],
  ["npm test", "npm", ["test", "--silent"]],
];
if (existsSync(path.join(root, "scripts/verify-ssr.sh"))) {
  checks.push(["scripts/verify-ssr.sh", "bash", ["scripts/verify-ssr.sh"]]);
}

const failed = [];
for (const [name, cmd, args] of checks) {
  const run = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (run.status !== 0) {
    const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-30).join("\n");
    failed.push(`### ${name} (exit ${run.status})\n${tail}`);
  }
}
if (failed.length === 0) process.exit(0);

console.log(
  JSON.stringify({
    decision: "block",
    reason:
      `Stop gate (${role}): ${failed.length} check(s) failed. Fix them within your owned paths, ` +
      `run the checks again, and update build.md. If a failure is outside your paths or needs a ` +
      `contract change, record it under "Open issues" in build.md and stop again (you will be let through).\n\n` +
      failed.join("\n\n"),
  }),
);
