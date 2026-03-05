# CLAUDE.md — CareSupport v2

## What This Is

CareSupport is a care coordination agent that texts with family members 1:1 and in group chats via iMessage/SMS. Convex is the backend. Linq is the iMessage gateway. Claude is the LLM.

For the full design document → `docs/design.md`

## How It Works

```
iMessage arrives via Linq webhook
  → convex/http.ts verifies signature, resolves chat → family
  → handler.ts: route sender → build prompt → call Claude
  → structured output: sms response + table updates (meds, schedules, context)
  → enforcement: access control, PHI filtering, approval gates
  → response sent via Linq API
```

## Build/Lint/Test Commands

- **Type-check:** `npx tsc --noEmit`
- **Test:** `npm test` (vitest)
- **Convex dev:** `npx convex dev`
- **Seed:** `npm run seed` (populate Convex with pilot family data)
- **Deploy:** `npx convex deploy`

## Key Rules

1. Safety enforcement is mechanical (code in `convex/lib/enforcement/`), not just prompt-level
2. All state mutations go through Convex mutations — no direct file edits
3. Three access levels: `full`, `standard`, `view_only` — enforced per-membership
4. Medication changes always require coordinator approval (hardcoded safety rule)
5. Medical info is 1:1 only — never shared in group chats
6. Agent writes to `context` fields on families and members — no markdown blob round-trips

## Schema Overview

| Table | Purpose |
|-------|---------|
| `families` | Family/network info + agent-written context |
| `members` | People in families, roles, access levels, agent-written context |
| `chats` | Linq chat tracking (1:1 and group) |
| `messages` | Conversation history linked to chats |
| `medications` | Structured med records (access-controlled) |
| `scheduleItems` | Shifts, appointments, tasks, rides |
| `approvals` | Pending coordinator confirmations |
| `auditLogs` | Audit trail |
| `lessons` | Agent corrections and learned patterns |

## Transitional State

The Convex schema (schema.ts) is v2 — structured tables for medications, schedules, and agent-written context fields. However, handler.ts and promptContent.ts still use v1 field names in the agent's structured output (familyFileUpdates, memberUpdates). The migration to v2 output format (familyContextUpdate, memberContextUpdate with typed table operations) is a separate task. Match the working code, not the design aspirations.
