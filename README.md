# CareSupport

Care coordination that runs on text messages and markdown files.

CareSupport is an AI agent that coordinates care teams over SMS/iMessage. Family members, caregivers, and agencies text a single number. The agent tracks schedules, medications, handoffs, and escalations — writing everything to `family.md` files that serve as the operational database.

## How It Works

```
SMS/iMessage arrives via Linq API
  → phone number resolved to family + member
  → system prompt assembled (SOUL.md + capabilities + family context)
  → AI generates response (Claude Haiku via OpenRouter)
  → enforcement layer filters PHI, audits, and gates approvals
  → response sent back via Linq
```

The core pipeline lives in `runtime/scripts/sms_handler.py`. Identity in `SOUL.md`. Safety gates in `runtime/enforcement/`.

## Running It

```bash
# Start the poller (in tmux)
tmux new-session -d -s caresupport "python3 runtime/scripts/poll_inbound.py --interval 15"

# Dry-run a message
python runtime/scripts/sms_handler.py --from "+1..." --body "test" --dry-run

# Send via Linq CLI
python runtime/scripts/linq_gateway.py create --to "+1..." --body "Hello" --service iMessage

# Run tests
cd runtime && PYTHONPATH=. python -m pytest tests/ -v
```

## Repo Structure

```
AGENTS.md              — Agent routing table (start here if you're an AI)
SOUL.md                — Agent identity and voice (loaded every message)
ARCHITECTURE.md        — System diagram and domain boundaries
agent_root.md          — Runtime routing for intent-based doc loading

runtime/
  scripts/             — sms_handler, poll_inbound, linq_gateway, webhooks
  enforcement/         — role_filter, phi_audit, family_editor, approval_pipeline
  learning/            — capabilities, lessons, correction tracking
  tests/               — test suites (88 structural checks)

fork/
  workspace/
    families/          — live family data (routing.json, family.md, members/)
    protocols/         — 16 care protocols (meds, scheduling, handoffs, etc.)
  simulation/          — 5 test families + synthesis results
  onboarding/          — schedule templates (JSON)

docs/
  PRODUCT_STRATEGY.md  — full strategy: network types, roles, roadmap
  VISION.md            — product vision and north-star narrative
  SECURITY.md          — enforcement posture and threat model
  RELIABILITY.md       — system reliability assessment
  QUALITY_SCORE.md     — grades per layer
  product-specs/       — SMS coordination spec
  design-docs/         — architecture decision records
  references/          — Linq, HIPAA, Twilio setup docs
  exec-plans/          — active work plans and tech debt tracker
```

## Key Decisions

- **Files as database** — `family.md` is the source of truth per family. No external DB.
- **Mechanical safety** — PHI filtering, approval gates, and audit logging are code, not prompt instructions.
- **Surgical edits** — family files are updated with `Edit` (find-and-replace), never overwritten.
- **16 care protocols** — domain knowledge the agent loads on demand based on message intent.

## For AI Agents

Read [`AGENTS.md`](AGENTS.md) first. It routes you to exactly the files you need for your task.

## For Humans

Read [`CLAUDE.md`](CLAUDE.md) for build commands, project rules, and the full product context.
