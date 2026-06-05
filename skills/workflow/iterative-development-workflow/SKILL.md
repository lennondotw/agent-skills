---
name: iterative-development-workflow
description: Iterative development workflow with small reviewable steps, CI polling, and agent logging. Use when starting a multi-step implementation, when the user asks about development workflow, CI integration, or iterative coding practices.
---

# Iterative Development Workflow

Work iteratively in small, reviewable steps.

- Each iteration should be a small change set (avoid large batches).
- Write/adjust tests for every change and ensure all tests pass.
- At every stage, provide a human-friendly way to validate (e.g., a simple command, demo entry, or checklist).
- When everything is green, push to GitHub.
- Use `gh` to poll CI status every 10s; do not hand off until CI passes.
- Before starting the next iteration, ensure the working directory is clean and the repo is healthy.

## Logging

- Record a log for each iteration at:
  `.agents/logs/YYYYMMDD-HHMMSS-slug-task-name.md`
- Ensure `.agents/logs/` is in `.gitignore` and never committed.

Only after CI passes, deliver the result for final verification/testing, then proceed to the next iteration.
