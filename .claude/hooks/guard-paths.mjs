#!/usr/bin/env node
// PreToolUse guard: turns each role's Paths table (agents/<role>.md) into a hard limit.
// Usage: node guard-paths.mjs              (.claude/settings.json: role = the subagent's agent_type)
//        node guard-paths.mjs orchestrator (.claude/skills/ship/SKILL.md: main-session calls only)
// Writes outside the role's owned paths and reads of its "never open" files are denied (exit 2).
// Bash writes are not covered: the reviewer's G1 check on the diff is the backstop.
import { readFileSync } from "node:fs";
import path from "node:path";

const QA_OWNED = ["**/*.test.ts", "scripts/verify-ssr.sh", "e2e/**", "playwright.config.ts"];
const STATE = "handoffs/STATE.md";
// Orchestrator-only files (D-033): the round log and the contracts-as-built notes.
const ORCH_ONLY = [STATE, "handoffs/LOG.md", "handoffs/CONTRACTS.md"];

const QA = {
  write: [...QA_OWNED, "handoffs/phase-*/qa.md"],
  noRead: [...ORCH_ONLY, "handoffs/phase-*/review.md", "handoffs/phase-*/diff.patch"],
};

// write: owned globs. noWrite: wins over write. noRead: never open. readOnly: allowlist (reviewer).
const ROLES = {
  orchestrator: {
    write: ["handoffs/**", "docs/intervention-log.md", "docs/next-16-notes.md"],
  },
  "data-auth": {
    write: ["src/lib/**", "src/proxy.ts", ".env.example", "handoffs/phase-*/build.md"],
    noWrite: QA_OWNED,
    noRead: ORCH_ONLY,
  },
  ui: {
    write: ["src/app/**", "src/components/**", "next.config.ts", "handoffs/phase-*/build.md"],
    noWrite: QA_OWNED,
    noRead: ORCH_ONLY,
  },
  // D-035: records the human's feature decisions in the source-of-truth docs, schema and mock.
  architect: {
    write: [
      "docs/architecture.md",
      "docs/design.md",
      "docs/decisions.md",
      ".claude/rules/*.md",
      "src/schemas/**",
      "src/data/**",
      "handoffs/feature-*/architect.md",
    ],
    noWrite: QA_OWNED,
    noRead: ORCH_ONLY,
  },
  qa: QA,
  "qa-run": QA, // same role as qa on a cheaper model (D-033)
  reviewer: {
    write: [],
    readOnly: [
      "agents/reviewer.md",
      "handoffs/phase-*/spec.md",
      "handoffs/phase-*/diff.patch",
      // D-035 docs mode: the human's decisions and the architect's diff (never architect.md).
      "handoffs/feature-*/intake.md",
      "handoffs/feature-*/docs.patch",
      "docs/architecture.md",
      "docs/design.md",
      "docs/decisions.md",
      ".claude/rules",
      ".claude/rules/*.md",
      // D-033: the current code around a hunk; handoffs/ stays closed (D-013 item 1).
      "src",
      "src/**",
      "scripts",
      "scripts/**",
      "e2e",
      "e2e/**",
      "playwright.config.ts",
    ],
  },
};

const input = JSON.parse(readFileSync(0, "utf8"));
const explicit = process.argv[2];

if (explicit && !ROLES[explicit]) {
  console.error(`guard-paths: unknown role "${explicit}". Fix the hook registration.`);
  process.exit(2); // fail closed: a misconfigured guard blocks instead of waving everything through
}
// The orchestrator guard (from /ship) is session-wide, so it judges main-session calls only and
// leaves subagent calls to the settings.json registration. Agents outside the roster are not ours.
if (explicit === "orchestrator" && input.agent_type) process.exit(0);
const role = explicit ?? input.agent_type;
const rules = ROLES[role];
if (!rules) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const ti = input.tool_input ?? {};
const tool = input.tool_name;
const target = ti.file_path ?? ti.notebook_path ?? ti.path ?? input.cwd ?? root;
const rel = path.relative(root, path.resolve(input.cwd ?? root, target)).split(path.sep).join("/");

if (rel.startsWith("..") || path.isAbsolute(rel)) process.exit(0); // outside the repo: not an ownership question

const match = (globs = []) => globs.some((g) => path.matchesGlob(rel, g));
const deny = (why) => {
  console.error(
    `Blocked by guard-paths (${role}): ${why}\n` +
      `Path: ${rel || "."}\nSee the Paths table in agents/${role}.md. ` +
      `If the task really needs this path, stop and record it under "Open issues" (escalate); do not work around this block.`,
  );
  process.exit(2);
};

const isRead = tool === "Read" || tool === "Grep" || tool === "Glob";

if (isRead) {
  if (rules.readOnly && !match(rules.readOnly)) {
    deny(
      tool === "Grep" && !ti.path
        ? "Grep without a path searches the whole repo, including files you must not see. Pass a path from your inputs."
        : "not one of your inputs (context-blind review, D-013 item 1).",
    );
  }
  if (match(rules.noRead)) deny("this file is on your never-open list (D-024).");
  process.exit(0);
}

if (match(rules.noWrite)) deny("qa owns test files; builders never edit them (D-025).");
if (!match(rules.write)) deny("outside your owned paths (D-023).");
process.exit(0);
