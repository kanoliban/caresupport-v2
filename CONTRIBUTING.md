# Contributing — The Process to Main

This applies to **everyone**: Liban, Claude Code, Codex, any future agent or
human. No exceptions, no "just this once." Main only moves by pull request.

## Why this exists

On 2026-07-02 a docs commit made directly to main rebuilt production from
stale code and rolled the live site back (see
`docs/incidents/2026-07-02-group-chat.md` for the sibling incident the same
day). Both incidents had the same root cause: **rules that lived in habit
instead of machinery**. This file is the machinery's manual.

## The process (every change, no matter how small)

```
1. git checkout -b <yourname>/<short-topic> origin/main
2. work; commit as you go
3. verify locally:   npx tsc --noEmit   (repo root AND web/)
                     npm test
4. git push -u origin <branch>
5. gh pr create --fill        (Vercel builds a preview automatically)
6. wait for CI (typecheck + tests + build) to go green
7. merge the PR (squash preferred), delete the branch
8. main deploys to production automatically (Vercel git integration)
```

Convex order: if the change touches `convex/` schema or function signatures
that the web layer calls, run `npx convex deploy -y` (prod) **before** the PR
merges, so the backend accepts the new arguments before the site sends them.

## Hard rules

- **Never push directly to main.** Not from the CLI, not from the GitHub web
  editor, not from a phone. Docs commits included — put them in a PR too.
- **Never `vercel deploy --prod`.** Production is built from main by the git
  integration only. CLI production deploys get silently clobbered by the next
  push to main.
- **Never merge red.** If CI fails, fix or close.
- Emergency bypass (production down, PR flow too slow):
  `BYPASS_MAIN_GUARD=1 git push origin main` — then write what/why in
  `docs/agent-log.md` immediately.

## Enforcement layers (what actually stops you)

| Layer | Blocks | Status |
|-------|--------|--------|
| `.githooks/pre-push` | direct `git push` to main from any local clone | committed; activate per clone (below) |
| GitHub Actions CI (`.github/workflows/ci.yml`) | broken code reaching main unnoticed (runs on PRs and on main pushes) | active |
| Vercel ignored-build-step | docs-only commits triggering site rebuilds | active |
| GitHub branch protection (require PR + green CI, include admins) | web-UI commits, force pushes — the only layer that stops everything | **requires GitHub Pro (private repo)** — enable when upgraded |

## One-time setup per clone

```bash
git config core.hooksPath .githooks
```

Agents: this repo's CLAUDE.md instructs you to verify this is set at session
start. If `git config core.hooksPath` prints nothing, set it before any push.
