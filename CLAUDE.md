# CLAUDE.md — CareSupport

> **Agents:** Read `AGENTS.md` first — it routes you to the right files based on your task.

## What This Is

CareSupport is a care coordination agent that texts with family members 1-to-1 via iMessage/SMS. Files are the database: `family.md` holds operational state, `SOUL.md` defines agent identity, member profiles track individual context.

For full product strategy and domain model → `docs/PRODUCT_STRATEGY.md`

## How It Works

```
SMS/iMessage arrives
  → poll_inbound.py picks up via Linq API
  → routing.json maps phone → family → member
  → sms_handler.py builds system prompt (SOUL.md + capabilities + lessons + family + member context)
  → AI responds via OpenRouter (claude-haiku primary)
  → Response sent back via Linq
```

## Build/Lint/Test Commands

- **Build:** `npm run build` (tsc -b && vite build)
- **Dev:** `npm run dev` (vite)
- **Lint:** `npm run lint` (eslint .)
- **Test:** `cd runtime && PYTHONPATH=. python -m pytest tests/ -v`
- **Dry run SMS:** `python runtime/scripts/sms_handler.py --from "+1..." --body "test" --dry-run`
- **Start poller:** `tmux new-session -d -s caresupport "python3 runtime/scripts/poll_inbound.py --interval 15"`

## Key Rules

1. Import from `runtime/config.py` — never hardcode paths
2. Safety enforcement is mechanical (code), not just prompt-level
3. family.md changes use Edit (surgical replacement), not Write (overwrite)
4. Check `docs/exec-plans/active/` before starting new work
