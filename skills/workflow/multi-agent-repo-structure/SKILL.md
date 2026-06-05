---
name: multi-agent-repo-structure
description: |
  Use when setting up, migrating, or reviewing repository-level instructions and local state for multiple coding agents such as Codex, Claude Code, Cursor, or other repo-aware agents; especially when AGENTS.md, CLAUDE.md, .agents, .claude, .cursor, worktrees, skills, symlinks, or gitignore rules are involved.
---

# Multi-Agent Repo Structure

## Core Principle

Use one durable instruction source, tool-neutral repo-owned assets, and tiny
compatibility symlinks. Keep generated agent state ignored.

## Preferred Layout

```text
AGENTS.md                         # repo instruction SSOT
CLAUDE.md -> AGENTS.md            # compatibility alias, not a second copy
.agents/
  skills/                         # versioned repo skills
  logs/                           # local iteration logs, ignored
  notes/                          # scratch notes, ignored
  reports/                        # generated local reports, ignored
  tmp/                            # temporary files, ignored
  worktrees/                      # local parallel-agent worktrees, ignored
.claude/
  settings.json                   # Claude-specific settings / MCP servers
  skills -> ../.agents/skills     # compatibility symlink when the repo has skills
.cursor/
  environment.json                # Cursor Background Agent environment
  rules/*.mdc                     # Cursor-only scoped rules when needed
```

## Decision Table

| Need                                             | Put It In                             |
| ------------------------------------------------ | ------------------------------------- |
| Rule every repo-aware agent must obey            | `AGENTS.md`                           |
| Claude compatibility with repo instructions      | `CLAUDE.md -> AGENTS.md`              |
| Reusable repo task recipe                        | `.agents/skills/<name>/SKILL.md`      |
| Claude compatibility with repo skills            | `.claude/skills -> ../.agents/skills` |
| Cursor-only scoped behavior                      | `.cursor/rules/<name>.mdc`            |
| Cursor remote machine setup                      | `.cursor/environment.json`            |
| Logs, notes, reports, temporary files, worktrees | ignored `.agents/*` paths             |

Do not add a new tool-specific instruction file unless the tool cannot read the
shared source. Prefer symlink aliases over duplicated prose.

## Migration Checklist

1. Read existing root instruction files and merge unique guidance into
   `AGENTS.md`.
2. Replace `CLAUDE.md` with a symlink to `AGENTS.md` after merging.
3. Move versioned repo skills from `.claude/skills/` to `.agents/skills/`.
4. Replace `.claude/skills` with `../.agents/skills` if Claude still needs the
   old path.
5. Delete or ignore local state: `.agent/`, `.worktrees/`,
   `.claude/worktrees/`, `.claude/scheduled_tasks.lock`, generated reports.
6. Rename durable `.agent` doc references to `.agents`; leave historical notes
   alone only when changing them would distort the record.
7. Add or update human docs explaining the repo contract. Agent instructions are
   for runtime; docs are for review, onboarding, and navigation.
8. Run a critical review pass before pushing: information architecture,
   tool-behavior claims, symlink portability, and ignore coverage.

## Gitignore Contract

Start strict, then explicitly re-include committed config:

```gitignore
.cursor/*
!.cursor/environment.json
!.cursor/rules/
.cursor/rules/*
.cursor/rules/**/*
!.cursor/rules/**/
!.cursor/rules/*.mdc
!.cursor/rules/**/*.mdc

.agents/logs/
.agents/notes/
.agents/reports/
.agents/tmp/
.agents/worktrees/
.worktrees/
.claude/worktrees/
.claude/notes/
.claude/scheduled_tasks.lock
```

For formatters, also ignore local worktree/state paths so repo-wide format
commands do not descend into nested checkouts.

## Verification Commands

Use concrete filesystem checks:

```bash
readlink CLAUDE.md
readlink .claude/skills
find .agent .worktrees .claude/worktrees .claude/scheduled_tasks.lock -maxdepth 0 -print 2>/dev/null
```

Verify ignore semantics, not just file contents:

```bash
printf '%s\n' \
  '.cursor/rules/foo.mdc' \
  '.cursor/rules/foo.txt' \
  '.cursor/rules/nested/bar.mdc' \
  '.cursor/rules/nested/bar.txt' \
  '.agents/reports/a.md' |
  git check-ignore -v --stdin --non-matching
```

Search for stale references:

```bash
rg -n '\.agent\b|\.agent/|CLAUDE\.md|\.claude/skills|\.worktrees|scheduled_tasks' .
```

## Current-Behavior Claims

If the change depends on current Codex, Cursor, or Claude Code behavior, verify
against official docs during the task. These surfaces change. Keep claims
narrow and repo-specific; do not replace local operational constraints with
generic vendor capability claims unless the repo actually relies on them.

## Review Heuristics

- Duplicated instruction files are drift risks.
- Symlinks are acceptable when relative, shallow, and verified with `readlink`.
- A path documented as local state must be ignored and checked with
  `git check-ignore`.
- A renamed page or concept needs matching link labels, not only working links.
- Historical planning docs should not claim the current SSOT is stale; rewrite
  those notes in past tense when they become misleading.
- If reviewer feedback is broad or vendor-generic, accept only the part that
  maps to a concrete repo risk.
