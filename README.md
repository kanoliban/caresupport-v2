# CareSupport

Care coordination that runs on text messages.

CareSupport is an AI agent that coordinates care teams over iMessage/SMS. Family members, caregivers, and the care recipient text a single number. The agent tracks schedules, medications, tasks, and member context — storing everything in Convex tables that serve as the operational database.

## How It Works

```
iMessage/SMS arrives via Linq webhook
  → convex/http.ts verifies signature, resolves chat → family
  → handler.ts: route sender → build prompt → call Claude
  → structured output: sms response + table updates
  → enforcement layer: access control, PHI filtering, approval gates
  → response sent back via Linq API
```

## Design

See [`docs/design.md`](docs/design.md) for the full design document — decisions, data model, and design principles.

## Key Concepts

- **iMessage is the UI.** No app, no dashboard. Coordinator onboards via text, invites their team.
- **Five access levels** — full, schedule+meds, schedule, provider, limited.
- **Coordinator is a role flag**, not a fixed person. Can be the care recipient (Rob), a family member (Liban), or shared.
- **Context fields** — each family and member has an agent-written `context` field that captures preferences, observations, and learned behavior. The agent reads and updates these on every message.
- **Structured tables** for medications and schedules (code needs these for access control, reminders, gap detection). Everything else lives in context fields.
- **Safety rules are code, not prompts** — PHI filtering, medication approval gates, and audit logging are enforced mechanically.

## Running It

```bash
# Convex dev server
npx convex dev

# Type-check
npx tsc --noEmit

# Tests
npm test

# Deploy
npx convex deploy
```

## Repo Structure

```
CLAUDE.md              — Build commands, project rules
SOUL.md                — Agent identity and voice
docs/design.md         — Design document (source of truth)

convex/
  schema.ts            — Database schema
  http.ts              — Linq webhook entry point
  handler.ts           — Message processing pipeline
  lib/enforcement/     — Access control, PHI filtering, approval gates
  lib/pipeline/        — Intent routing, prompt building, response parsing
  lib/anthropicClient  — Claude API client
  lib/linqClient       — Linq iMessage API client

fork/workspace/
  protocols/           — 16 care protocol files (domain knowledge)
  families/kano/       — Pilot family seed data

scripts/               — Seed scripts
tests/                 — Integration tests
archive/v1/            — Archived v1 artifacts (Python runtime, old docs)
```

## For AI Agents

Read [`CLAUDE.md`](CLAUDE.md) for build commands and project rules. Read [`docs/design.md`](docs/design.md) for product context. Ignore `archive/v1/` — it contains superseded v1 artifacts kept for reference only.
