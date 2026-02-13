---
name: codebase-engineering
description: Use when working on a user's codebase as an engineer—cloning repos, creating branches, making PRs, debugging, or doing typical software engineering tasks.
---

## Viktor Spaces vs User Codebases

- **Viktor Spaces** (`/work/viktor-spaces/`): Apps you build and manage for the user
- **User codebases** (`/work/repos/`): The user's own repositories where you act as an engineer

This skill is for the latter—working on existing codebases the user owns.

## GitHub Integration

Check if GitHub tools are available:

```python
from sdk.tools import github_tools
```

If `github_tools` exists, the user has connected GitHub. If not, ask them to connect at the integrations page.

## SDK Tools

**Important:** Never run `git` or `gh` commands directly via bash. Always use the SDK tools (`coworker_git`, `coworker_github_cli`) which handle authentication automatically.

## Repo Location

Always clone repos to `/work/repos/{repo-name}/`.

## Worktree Workflow

Never work directly on main. Always use worktrees for tasks:

```bash
cd /work/repos/my-repo

# 1. Pull latest main
git checkout main
git pull origin main

# 2. Create worktree for your task
git worktree add ../wt-my-task -b feat/my-feature

# 3. Work in the worktree
cd ../wt-my-task
# ... make changes ...
git add .
git commit -m "Add feature"

# 4. Push and create PR
git push -u origin feat/my-feature
gh pr create --title "Add feature" --body "..."

# 5. Clean up after PR is merged
cd /work/repos/my-repo
git worktree remove ../wt-my-task
git branch -d feat/my-feature
```

## Branch Naming

Use descriptive branch names:
- `feat/{description}` — new features
- `fix/{description}` — bug fixes
- `refactor/{description}` — code improvements

## Before Starting Work

1. Pull latest from main
2. Create a worktree with a descriptive branch name
3. Understand the codebase structure before making changes

## After Completing Work

1. Push changes and create a PR
2. Clean up the worktree
3. Delete the local branch if merged
<!-- ══════════════════════════════════════════════════════════════════════════
