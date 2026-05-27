---
name: end-to-end-delivery
description: |
  End-to-end orchestration for shipping a multi-file change from concept to merged PR (or clean handoff). Use when the task touches more than one file, ends in a PR, or any time `gh pr create` is on the path. Sequences recon → plan → review → implement → verify → review → push → PR babysit → merge-or-handoff. Never fire-and-forget.
---

# End-to-End Delivery

## When this fires

The task ends in a PR (or a deliberate handoff). Single-line tweaks and exploratory prototyping skip this skill.

## Phases

Each phase has an entry condition, an exit condition, and a recommended sub-skill to invoke. Don't reinvent the sub-skills inline.

```
1. recon            (parallel subagents)        → dispatching-parallel-agents
2. plan             (main agent)                → writing-plans
3. plan review      (subagent, mandatory)       → requesting-code-review
4. user gate*       (only on review BLOCKERs)
5. implement        (frequent commits)          → subagent-driven-development
                                                + verification-before-completion
6. final review     (subagent on full diff)     → requesting-code-review
7. push + open PR                               → commit-and-merge (first half)
8. CI babysit                                   → babysit
9. merge OR handoff (deliberate, not default)
10. post-state monitoring                       → until safe to leave
```

`*` user gate is skippable if the user pre-authorized continuation.

## Principles

These earn their token cost — they're what existing sub-skills don't say.

### PR is never fire-and-forget

Enabling auto-merge isn't an exit. The flow ends when the PR is **merged-and-cleaned** or **handed-off-with-state-known**. While the PR is open you keep watching: CI status, merge queue, deploy preview, reviewer comments. Walking away mid-queue is the most common failure mode.

Concrete pitfalls observed in the wild:

- `gh pr merge --auto` returns exit-0 but `auto_merge: null` because the repo uses a merge queue. Verify with `gh api repos/{owner}/{repo}/pulls/{n} --jq .auto_merge` before considering it queued.
- Retargeting PR base (e.g. main → dev) does NOT trigger a new CI run by default. `pull_request.edited` isn't in the default trigger set. Push an empty commit to retrigger.
- Merge queue runs (`gh-readonly-queue/...`) lag the PR API state. The PR can read `state: OPEN` for ~30s after the queue run completes.

### Plan-time review beats code-time review

Spending 5 minutes on plan review catches BLOCKER-class design bugs before any code is written. Skipping plan review and discovering the same bugs in final review costs implementation time + revert time + re-implementation time. Plan review is mandatory; final review is mandatory; "I'll review my own work" is not.

### Frequent commits serve handoff

Commits aren't just safety; they're the unit of handoff. When the work has to pass to another agent or human (CI red, queue stuck, scope shift, end-of-day), each independent commit is a cherry-pick / revert / discussion target. Aim for one commit per atomic concern, even if you'll squash them later. The `chore: trigger CI re-run` empty commit is fine — the merge queue or rebase tools will drop it cleanly.

### Auto-merge is opt-in, not the default

Default exit is **handoff for human review**. Auto-merge requires explicit user authorization, AND verified CI green, AND no reviewer comments outstanding, AND cleanup capacity (worktree teardown, branch delete) afterwards.

### Pre-authorization is explicit

Users may say "execute the plan without confirming the review" or "merge directly when CI is green" up front. Honor those exactly; don't quietly add gates the user has already removed. Conversely, never silently skip a gate the user didn't authorize.

## The merge-or-handoff gate

The gate fires after CI is green and final review has zero open BLOCKERs.

| Condition | Action |
|---|---|
| User pre-authorized merge AND CI green AND no review BLOCKERs AND no reviewer comments | merge with `gh pr merge --rebase`, then verify `state: MERGED`, then clean worktree + local branch |
| User wants handoff (default if not specified) | leave PR open with green CI; report PR URL, current state, branch name, worktree location, and any context the next agent / human needs |
| Reviewer left comments | apply `receiving-code-review`; do not merge until comments resolved |
| CI red | apply `babysit`; do not hand off until either green or root cause documented and user notified |

Handoff is not abandonment. The state report on handoff includes:

- PR URL + current `mergeStateStatus`
- Branch name, base branch, current HEAD SHA
- Worktree path (if not yet removed)
- Any pending TODOs left in code (`grep -n TODO` on the diff)
- What action the next owner needs to take (review / merge / fix / decide)

## Cadence and commit hygiene

- One commit per atomic concern. Mixed concerns make review harder.
- Commit message body explains *why*, not *what*. The diff already shows what.
- Run `git diff` and read the last ~10 commit messages on the target branch before composing each commit. Match style.
- Don't include any AI tool name in commit messages or PR descriptions.
- Use `git commit --amend` only on commits you authored in the current session and have not pushed. Never amend after `git push`.

## What this skill does NOT replace

- TDD discipline (`test-driven-development`)
- Debugging methodology (`systematic-debugging`)
- Branch finishing / cleanup (`finishing-a-development-branch`)
- Worktree setup (`using-git-worktrees`)

This skill orchestrates them; it doesn't reimplement them.

## Anti-patterns

- Skipping plan review because "the change is small". The 4 BLOCKERs caught in plan review of a 1,500-line "small primitive" say otherwise.
- Treating CI green as "done". CI green + review-clean + merge-state-resolved is "done".
- Calling `gh pr merge --auto` and walking away. Verify it actually queued, then watch it land.
- Committing the implementation in one giant commit. Bad for review, bad for handoff, bad for partial revert.
- Force-pushing to a feature branch with auto-merge already requested. Auto-merge silently re-targets the new HEAD; if the new HEAD is broken you've armed a self-merging bomb.
