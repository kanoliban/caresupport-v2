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
3. Five access levels: `full`, `schedule+meds`, `schedule`, `provider`, `limited` — enforced per-membership
4. Medication changes always require coordinator approval (hardcoded safety rule)
5. Medical info is 1:1 only — never shared in group chats
6. Agent writes to `context` fields on families and members — no markdown blob round-trips
7. Every DB query on family-scoped data must filter by `familyId` — phone-only lookups are for member resolution only

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

The agent now outputs both v1 fields (familyFileUpdates for freeform notes) and v2 structured fields (medicationUpdates, scheduleUpdates, careTeamUpdates). Both are processed — structured updates go to typed tables, freeform updates still go to families.context. The context prompt is built from typed tables first, with families.context appended as "Notes". Existing markdown in families.context will be migrated to typed tables via a one-time script (not yet written).

## Multi-Agent Setup

See `AGENTS.md` for shared state between Claude (architecture/reasoning) and Codex (execution/deployment). Codex handoff context is in `docs/codex-handoff.md`.
