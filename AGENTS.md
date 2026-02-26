# AGENTS.md — CareSupport Orchestrator

You are working on a care coordination system. This file routes you to the right context. Don't read everything — read only what your task needs.

## Boot Sequence

1. You just read this file
2. Find your task type in the routing table below
3. Read ONLY the listed files for that task
4. Start working

## Context Routing

### SMS/Message Pipeline
The 13-step pipeline that processes inbound messages and generates responses.
- `runtime/scripts/sms_handler.py` — core pipeline: phone resolution → context assembly → AI call → response
- `runtime/config.py` — all paths, settings, API config (import this, never hardcode)
- `SOUL.md` — agent identity loaded into system prompt at runtime
- `runtime/learning/capabilities.md` — CAN/CANNOT list injected into every prompt
- `runtime/learning/lessons.md` — corrections from conversations, max 20 entries

### Agent Routing Layer
How the runtime agent decides which docs to load per message intent.
- `agent_root.md` — Master routing doc loaded into every system prompt
- `docs/personality.md` — Expanded voice/tone guidance (loaded on demand)
- `docs/onboarding.md` — New user flows, first-contact scripts
- `docs/tasks/scheduling.md` — Schedule and availability playbook
- `docs/tasks/checkins.md` — Check-in and outreach playbook
- `docs/tasks/escalations.md` — Escalation chain and patterns
- `docs/tasks/medications.md` — Medication management playbook
- `docs/tasks/model_routing.md` — Model cost optimization rules

### Adding or Modifying Family Members
How families and member profiles are structured.
- `docs/member-onboarding.md` — full process: directory layout, routing.json schema, member profile template
- `fork/workspace/families/kano/` — live example (routing.json, family.md, members/)

### Enforcement Layer
Mechanical safety gates on every SMS interaction.
- `runtime/enforcement/role_filter.py` — pre-filters context by access level
- `runtime/enforcement/phi_audit.py` — HIPAA-compliant logging
- `runtime/enforcement/family_editor.py` — edit-not-write file updates with backup
- `runtime/enforcement/approval_pipeline.py` — YES/NO confirmation for med/member changes
- `docs/SECURITY.md` — what's enforced mechanically vs prompt-level

### Transport & Messaging (Linq/iMessage)
How messages get in and out via Linq Partner API V3.
- `runtime/scripts/linq_gateway.py` — Linq API client (create chat, send, poll, typing, reactions)
- `runtime/scripts/poll_inbound.py` — polling loop that picks up new messages
- `runtime/scripts/webhook_receiver.py` — real-time webhook handler (alternative to polling)
- `runtime/scripts/linq_config.json` — Linq credentials and phone number

### Product Strategy & Domain Model
Full product context for strategic decisions.
- `docs/PRODUCT_STRATEGY.md` — complete strategy: network types, roles, policy packs, roadmap, metrics
- `docs/VISION.md` — product vision and north-star narrative
- `ARCHITECTURE.md` — system diagram, domains, dependency rules

### Project State & History
What's been built, what's in progress, what's broken.
- `docs/MEMORY.md` — chronological project log and current state
- `docs/exec-plans/tech-debt-tracker.md` — known gaps and technical debt
- `docs/exec-plans/active/` — current work plans
- `docs/QUALITY_SCORE.md` — grades per layer
- `docs/RELIABILITY.md` — system reliability assessment

### Agent Identity & Learning System
How the runtime agent knows who it is and learns from corrections.
- `SOUL.md` — identity, voice, behavioral constraints (~30 lines, loaded every message)
- `runtime/learning/capabilities.md` — explicit CAN/CANNOT list
- `runtime/learning/lessons.md` — accumulated corrections
- `runtime/learning/__init__.py` — shared `append_lessons()` utility
- `runtime/scripts/review_conversations.py` — CLI for reviewing conversations and adding lessons

### Care Protocols
Domain knowledge the agent uses for coordination.
- `fork/workspace/protocols/` — 16 PROTOCOL.md files (medications, scheduling, handoffs, etc.)

## Repository Map

```
AGENTS.md                 ← You are here (orchestrator)
CLAUDE.md                 ← Build commands, key rules, product summary
SOUL.md                   ← Runtime agent identity (loaded into every system prompt)
agent_root.md             ← Runtime agent routing (loaded into every system prompt)
ARCHITECTURE.md           ← System diagram, domains, dependency rules
docs/
  PRODUCT_STRATEGY.md     ← Full product strategy (sections 0-16)
  MEMORY.md               ← Project chronological log
  member-onboarding.md    ← How to add families and members
  personality.md          ← Expanded voice/tone (on demand)
  onboarding.md           ← New user flows (on demand)
  tasks/                  ← Task playbooks (on demand)
    scheduling.md         ← Schedule/availability requests
    checkins.md           ← Check-in and outreach
    escalations.md        ← Escalation chain
    medications.md        ← Medication management
    model_routing.md      ← Model cost optimization
  design-docs/            ← Architecture decisions
  exec-plans/             ← Active plans, completed, tech debt
  QUALITY_SCORE.md        ← Grades per layer
  RELIABILITY.md          ← System reliability assessment
  SECURITY.md             ← Enforcement posture
  VISION.md               ← Product vision and north-star narrative
  product-specs/          ← SMS coordination spec
  references/             ← Linq, HIPAA, Twilio setup docs
runtime/
  config.py               ← All paths and settings (single source of truth)
  learning/               ← lessons.md, capabilities.md, __init__.py
  enforcement/            ← role_filter, phi_audit, family_editor, approval_pipeline
  scripts/                ← sms_handler, poll_inbound, linq_gateway, webhook_receiver, review_conversations
  tests/                  ← Test suites
fork/
  workspace/
    families/kano/        ← Live family: routing.json, family.md, members/
    protocols/            ← 16 care protocols
  simulation/             ← 5 test families + synthesis results
  onboarding/             ← Schedule templates (JSON)
```

## Key Rules

1. **Import from `runtime/config.py`** — never hardcode paths
2. **family.md changes use Edit, not Write** — surgical replacement prevents data loss
3. **Safety enforcement is mechanical** — code gates, not just prompt instructions
4. **Check `docs/exec-plans/active/` before starting new work**
5. **Update AGENTS.md routing table when adding new files**

## Build & Run

```bash
# Type check
npm install && npx tsc --noEmit

# Run tests
cd runtime && PYTHONPATH=. python -m pytest tests/ -v

# Dry-run SMS handler
python runtime/scripts/sms_handler.py --from "+1..." --body "test" --dry-run

# Start poller (in tmux)
tmux new-session -d -s caresupport "python3 runtime/scripts/poll_inbound.py --interval 15"

# Send a message via Linq CLI
python runtime/scripts/linq_gateway.py create --to "+16517037981" --body "Hello" --service iMessage

# Review recent conversations
python runtime/scripts/review_conversations.py --hours 24
```
