# Architecture

Top-level map of CareSupport's domains, layers, and dependency directions.

## The System

```
┌─────────────────────────────────────────────────────────────────────┐
│              iMessage/RCS/SMS via Linq Partner API V3               │
│                    inbound ↓     ↑ outbound                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Plumbing         │  │  Reasoning     │  │  Enforcement     │   │
│  │                   │  │                │  │                  │   │
│  │ webhook_receiver──│─▶│ sms_handler    │─▶│ role_filter      │   │
│  │ linq_gateway      │  │ (AI agent)     │  │ phi_audit        │   │
│  │ reaction_handler  │  │                │  │ family_editor    │   │
│  │ poll_inbound      │  │                │  │ approval_pipeline│   │
│  │                   │  │                │  │ message_lock     │   │
│  └──────┬────────────┘  └───────┬────────┘  └────────┬─────────┘   │
│         │                       │                    │             │
│         │                       ▼                    │             │
│         │               ┌──────────────┐             │             │
│         │               │  State       │             │             │
│         │               │              │             │             │
│         └──────────────▶│ family.md    │◀────────────┘             │
│                         │ conversations│                           │
│                         │ audit logs   │                           │
│                         └──────────────┘                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Proactive Systems (crons)                                   │   │
│  │                                                               │   │
│  │  heartbeat → 48hr scan → alerts                              │   │
│  │  maintenance → prune, validate, grade                        │   │
│  │  reminders → medication, appointment, check-in               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     Knowledge Layer                                 │
│                                                                     │
│  AGENTS.md → docs/ → protocols/ → system prompt                    │
│  (navigation)  (truth)  (procedures)  (behavior)                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Domains

### 1. Transport Plumbing
Moves bytes between messaging providers and the agent. No intelligence.

- **Location:** `runtime/scripts/`
- **Primary (iMessage):** `webhook_receiver.py` (push), `linq_gateway.py` (send), `reaction_handler.py` (tapbacks)
- **Polling fallback:** `poll_inbound.py` (cron poll, uses linq_gateway)
- **Config:** `runtime/config.py` (LinqConfig)
- **Docs:** `runtime/README.md`, `docs/references/linq-setup.md`

### 2. Agent Reasoning
The AI that reads family.md, understands the message, and generates a response.

- **Location:** `runtime/scripts/sms_handler.py` (handler), `agent/system-prompt.md` (template), `fork/system-prompt.md` (production prompt)
- **Protocols:** `fork/workspace/protocols/` (16 care protocols)
- **Validation:** `fork/simulation/` (52 conversations, 99.5%)

### 3. Safety Enforcement
Mechanical checks that run before any message is sent. Not prompt-level — code-level.

- **Location:** `fork/workspace/sdk/utils/role_filter.py`, `fork/workspace/sdk/utils/phi_audit.py`
- **Status:** Skeleton. Not wired into runtime. See `docs/SECURITY.md`.

### 4. State
The persistent context that makes the system valuable over time.

- **family.md:** Per-family care context. Spec at `docs/design-docs/family-md-spec.md`.
- **conversations/:** Per-phone message history.
- **logs/:** PHI audit trail, agent run logs.
- **Example:** `examples/rob-family.md`

### 5. Proactive Systems
Crons that scan, alert, and maintain without waiting for an SMS.

- **Status:** Designed in `fork/PRODUCTION-PLAN.md`. Not built as code.
- **Planned:** Heartbeat (48hr scan), medication reminders, maintenance/pruning.

### 6. Knowledge
Documentation that agents read to understand the system.

- **Entry point:** `AGENTS.md`
- **Design docs:** `docs/design-docs/` (indexed, with verification status)
- **Execution plans:** `docs/exec-plans/` (active/completed/tech-debt)
- **Product specs:** `docs/product-specs/`
- **References:** `docs/references/`
- **Quality/Security/Reliability:** `docs/QUALITY_SCORE.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`

## Dependency Direction

```
Knowledge → Reasoning → Enforcement → State
                ↑                       │
                └───────────────────────┘
                (reads state, updates state)

Plumbing → Reasoning (pipes messages to agent)
Proactive → Reasoning (triggers scans via agent)
```

Rules:
- Plumbing never reasons. It routes.
- Reasoning never stores directly. It requests state changes through enforcement.
- Enforcement never reasons. It checks and gates.
- State is passive. It's read and written, never acts.
- Knowledge is versioned. It's the ground truth for all agent sessions.

## Two File Types (the core insight)

| | family.md | PROTOCOL.md / docs |
|---|---|---|
| Contains | Operational state of one care network | Agent knowledge, procedures, architecture |
| Changes | Every interaction | Deliberately, by plan |
| Purpose | What's happening now | How to do things |
| One per | Family | Domain |

Full explanation: `docs/design-docs/primitive-shift.md`
