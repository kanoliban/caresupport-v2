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
- `docs/ROADMAP.md` — product roadmap, phases, and scaling challenges
- `ARCHITECTURE.md` — system diagram, domains, dependency rules
- `docs/design-docs/convex-schema-assurance-rfc.md` — canonical Convex v2 schema invariants and migration mapping

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
- `runtime/learning/capabilities.md` — explicit CAN/CANNOT list (gates)
- `runtime/learning/skills/` — conversation skills (social, onboarding, scheduling)
- `runtime/learning/lessons.md` — accumulated corrections
- `runtime/learning/__init__.py` — shared `append_lessons()` utility
- `runtime/scripts/review_conversations.py` — CLI for reviewing conversations and adding lessons

### Review & Learning
How to evaluate agent behavior and improve the system.

**Two tiers of review.** The easy tier is mechanical: `review_loop.py` catches
rule violations (multi-question, forbidden phrases) automatically. The hard tier
is contextual: the agent calling Degitu both "grandmother" and "aunt" in one
response, or missing member context that caused the confusion in the first place.
That needs Opus reading the full transcript.

**Why staging exists.** Without it, every `review_loop` run writes lessons to
real files. Testing = mutating production data. Staging is a scratch pad —
nothing touches production until you explicitly promote it. Only things that
survive scrutiny become permanent.

**The most valuable findings aren't rule violations.** They're things we didn't
know we needed: a member profile missing the family tree, a flow with no
protocol, a process gap nobody thought to codify. If we constrain what "good
output" looks like, we lose these. `proposals/` stays markdown (not schema)
so Opus can surface whatever it notices.

- `runtime/scripts/review_loop.py` — rule-based analysis (mechanical tier)
- `runtime/scripts/review_staging.py` — staging: snapshot, restore, reset, save, diff, promote, list
- `runtime/learning/skills/` — skill files the agent should follow
- `runtime/learning/lessons.md` — global corrections
- `fork/workspace/families/{id}/lessons.md` — per-family corrections
- `fork/workspace/families/{id}/staging/` — three piles with different lifecycles:
  - `reviews/` — disposable test output. Accumulates with each --stage run. Cleared on reset.
  - `saved/` — curated material. Reviews flagged as worth revisiting. Survives resets. Opus's reading pile.
  - `proposals/` — where Opus writes back. (Future use.)
- **Direct workflow:** `review_loop --full` → findings + transcript → suggest lessons, skill edits, spec changes

- **Staged testing protocol (follow this exactly):**

  **Setup (once per testing session):**
  ```
  review_staging.py snapshot --family kano       # lock baseline — this is your safety net
  ```

  **Test loop (repeat as many times as needed — nothing permanent happens here):**
  ```
  review_loop.py --since 3h --family kano --full --stage   # run 1 → reviews/
  review_loop.py --since 3h --family kano --full --stage   # run 2 → reviews/
  review_loop.py --since 3h --family kano --full --stage   # run N → reviews/

  review_staging.py list --family kano                      # see what you got
  review_staging.py diff --family kano                      # confirm live files untouched

  review_staging.py save --family kano --review {ts} --name family-tree-confusion   # flag interesting ones
  review_staging.py reset --family kano                     # restore baseline + clear reviews/ (saved/ untouched)
  ```
  Then iterate. Change the agent, run more tests, save what's interesting, reset, repeat.
  `saved/` accumulates across cycles. `reviews/` gets cleared each time.

  **When ready (this is the one-way door — the only moment real files change):**
  ```
  review_staging.py promote --family kano --review {ts} [--items 0,1]   # push approved lessons to production
  ```

  **Other commands:**
  - `diff` — baseline vs live (verify nothing leaked)
  - `list` — show all three piles at a glance
  - `restore` — revert to baseline without clearing reviews (use `reset` instead unless you have a reason)

  **Resist the shiny object.** During testing you WILL notice gaps — missing
  member lifecycle states, flows with no protocol, features that seem obvious
  to build right now. DO NOT stop testing to build them. Save the observation
  to `saved/` and keep going. The reasons:
  1. You're in a test cycle. Momentum matters more than plumbing.
  2. You don't have enough signal yet. Real interactions reveal what the
     abstraction actually needs to be. Building from one data point = guessing.
  3. The observation is more valuable than the implementation right now.
     When it's time to build, it'll be informed by real data, not speculation.

  Observations go to `saved/` with `"type": "process_observation"`. They
  graduate to Linear when there's enough signal to spec them properly — not
  before.

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
  ROADMAP.md              ← Product roadmap, phases, scaling challenges
  SECURITY.md             ← Enforcement posture
  VISION.md               ← Product vision and north-star narrative
  product-specs/          ← SMS coordination spec
  references/             ← Linq, HIPAA, Twilio setup docs
runtime/
  config.py               ← All paths and settings (single source of truth)
  learning/               ← lessons.md, capabilities.md, skills/, __init__.py
  enforcement/            ← role_filter, phi_audit, family_editor, approval_pipeline
  scripts/                ← sms_handler, poll_inbound, linq_gateway, webhook_receiver, review_loop, review_staging
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

# Review agent behavior (rule-based + transcript for Opus analysis)
python runtime/scripts/review_loop.py --since 24h --family kano --full

# Staged review cycle
python runtime/scripts/review_staging.py snapshot --family kano          # lock baseline
python runtime/scripts/review_loop.py --since 3h --family kano --full --stage  # test → reviews/
python runtime/scripts/review_staging.py save --family kano --review {ts} --name family-tree-confusion  # keep interesting ones
python runtime/scripts/review_staging.py reset --family kano             # restore + clear reviews/ (saved/ untouched)
python runtime/scripts/review_staging.py promote --family kano --review {ts} --items 0,1  # push to production
```
