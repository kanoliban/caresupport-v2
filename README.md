# CareSupport

A text-native family care assistant.

CareSupport learns how a family coordinates care around someone they love and helps carry that coordination load. Conversation is the interface; **action is the product.**

Today CareSupport runs as a solo beta — one user, one care case, one persistent iMessage/SMS thread — which is the *first relationship* of the broader product. The destination is one-to-many: CareSupport eventually coordinates across the family, professional caregivers, and agencies involved in a person's care. The solo wedge is how we earn the right to do that.

The most important sentences in the product:

> CareSupport does not arrive as an expert in your family. It becomes useful by learning your family.

> Every feature should reduce the number of times the care recipient (or primary coordinator) has to personally chase coordination.

## How It Works

```
iMessage / SMS arrives via Linq webhook
  → convex/http.ts verifies signature, resolves sender phone
  → handler.ts: load context → route intent → call Claude
  → structured output: sms response + typed updates (meds, schedule, memory, corrections)
  → mutations persist to Convex
  → response sent via Linq API
  → daily reminder digest fires from convex/crons.ts each morning
```

## Direction & Design Docs

| Doc | What it's for |
|---|---|
| [docs/product-thesis.md](docs/product-thesis.md) | What CareSupport is — the family-care-assistant thesis |
| [docs/rob-care-operations-model.md](docs/rob-care-operations-model.md) | The operational reality (Rob's 12-person team across 3 agencies) the product must serve |
| [docs/tools-and-capabilities-thought-experiment.md](docs/tools-and-capabilities-thought-experiment.md) | The 8-rung capability ladder: Remember → Remind → Draft → Ask permission → Act → Track → Escalate → Close the loop |
| [docs/agent-knowledge-visibility.md](docs/agent-knowledge-visibility.md) | How trust forms: in-flow disclosure of what CareSupport knows, never a dashboard to administer |
| [docs/implementation-plan-family-care-agent.md](docs/implementation-plan-family-care-agent.md) | How CareSupport evolves toward one-to-many coordination |
| [docs/design.md](docs/design.md) | Current runtime as built |

## Key Concepts

- **Text is the UI.** No app, no dashboard. Family members, caregivers, and agencies should be able to participate without installing anything.
- **Working understanding > database introspection.** CareSupport reveals what it knows at the moment that knowledge affects action ("I have… / I know… / I don't have… / I'm assuming… / Still open…"), not as a memory dump for the user to police.
- **Capability ladder, not full autonomy.** CareSupport moves up the ladder one rung at a time, earning trust before it acts on behalf of the user.
- **Solo beta is the first relationship.** It is not the final product identity.

## Running It

```bash
# Install
npm install

# Convex dev (writes convex/_generated/, required for tests that exercise mutations)
npx convex dev

# Type-check
npm run typecheck

# Unit + integration tests
npm test

# Seed pilot data
npm run seed

# Deploy
npx convex deploy
```

## Repo Structure

```
CLAUDE.md              — Build commands, project rules
SOUL.md                — Agent identity and voice
docs/                  — Product direction + design (see table above)

convex/
  schema.ts            — Database schema (solo-native: users, careCases, memoryEntries, ...)
  http.ts              — Linq webhook entry
  handler.ts           — Message processing pipeline
  reminders.ts         — Daily digest action
  crons.ts             — Daily digest schedule
  mutations.ts         — Convex mutations (user/care-case/memory/schedule/medication)
  lib/
    pipeline/          — Intent routing, prompt building, response parsing
    memory.ts          — Memory entry dedup + context assembly
    promptContent.ts   — SOUL / ROUTING / CAPABILITIES / SKILLS prompt strings
    digestComposer.ts  — Daily digest text generation
    anthropicClient.ts — Claude API client
    linqClient.ts      — Linq iMessage / SMS client

fork/workspace/        — Pilot family seed data
scripts/               — Seed scripts
tests/                 — Integration tests
archive/v1/            — Archived v1 artifacts (Python runtime, old docs). Ignore.
```

## For AI Agents

Read [CLAUDE.md](CLAUDE.md) for build commands and project rules. Read [docs/product-thesis.md](docs/product-thesis.md) and [docs/rob-care-operations-model.md](docs/rob-care-operations-model.md) for product context before making non-trivial changes. Ignore `archive/v1/`.
