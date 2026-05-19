# CLAUDE.md — CareSupport v2

## What This Is

CareSupport is a text-native family care assistant. It learns how a family coordinates care and helps carry that coordination load. The interface is iMessage/SMS via Linq. The backend is Convex. The LLM is Claude.

Today CareSupport runs as a solo beta — one user, one care case, one persistent thread. The solo beta is the **first relationship** of a one-to-many product, not the final shape. See [docs/product-thesis.md](docs/product-thesis.md) and [docs/rob-care-operations-model.md](docs/rob-care-operations-model.md) before any non-trivial change.

For the runtime design as built → [docs/design.md](docs/design.md).

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

## Build/Lint/Test Commands

- **Type-check:** `npm run typecheck` (or `npx tsc --noEmit`)
- **Test:** `npm test` (vitest)
- **Convex dev:** `npx convex dev` (also generates `convex/_generated/` required by mutation/handler tests)
- **Seed:** `npm run seed`
- **Deploy:** `npx convex deploy`

## Key Rules

1. **Conversation is the interface; action is the product.** Don't add a feature if it just gives the user better advice. Add it if it reduces what the user has to personally chase.
2. **Move up the capability ladder one rung at a time** — Remember → Remind → Draft → Ask permission → Act → Track → Escalate → Close the loop. Don't jump straight to autonomy.
3. **Surface working understanding in-flow, not as a dashboard.** Use "I have… / I know… / I don't have… / I'm assuming… / Still open…" — never make the user inspect or administer the agent's memory.
4. All state mutations go through Convex mutations — no direct DB writes.
5. Every DB query on care-case-scoped data must filter by `careCaseId`.
6. Memory writes go through `upsertMemoryEntries` so dedup + emotional-support filtering apply.
7. The agent should never claim a save unless the matching structured update field is present in its response.
8. The agent should never deny capabilities it actually has (e.g., the daily morning digest is real and ships from `convex/reminders.ts` — don't tell users push isn't on).

## Schema Overview (current — solo-native)

| Table | Purpose |
|-------|---------|
| `users` | The texting account owner (phone, name, careCaseId, status, relationshipToRecipient) |
| `careCases` | The loved one / care situation being managed (title, careRecipientName, timezone, status) |
| `messages` | Inbound + outbound message log, with Linq delivery metadata |
| `medications` | Structured med records (name, dose, schedule, status) |
| `scheduleItems` | Appointments, tasks, reminders (type, date, time, status, recurrence) |
| `memoryEntries` | Durable user/care-case memory — scope ∈ {user, care_case}, category ∈ {profile, communication_preference, care_preference, care_note, lesson} |
| `auditLogs` | Append-only audit trail of context loads, sends, failures, memory saves |

`families`, `members`, `approvals`, and a separate `lessons` table from earlier drafts do not exist. Lessons are stored as `memoryEntries` with `category: "lesson"`. There is no `convex/lib/enforcement/` directory in the current solo-native architecture.

## Agent Output Schema

The model returns JSON matching the `AgentResponse` type in [convex/lib/pipeline/types.ts](convex/lib/pipeline/types.ts):

- `smsResponse` — text sent to the user
- `internalNotes` — private reasoning
- `userProfileUpdate` — durable user fields (name, relationship_to_recipient, status)
- `careCaseProfileUpdate` — durable care-case fields (care_recipient_name, timezone, status)
- `userMemoryUpdates` — user-scope memory entries
- `careCaseMemoryUpdates` — care-case-scope memory entries
- `selfCorrections` — lessons (`[behavioral]` / `[factual]` / `[operational]` prefix)
- `medicationUpdates` — typed med add/update/remove
- `scheduleUpdates` — typed schedule add/update/remove
- `reactions`, `effect` — iMessage tapbacks and effects

Earlier output names like `familyFileUpdates`, `memberUpdates`, `careTeamUpdates`, `needsOutreach`, and `routingUpdates` are from the deprecated multi-family architecture and are not part of `AgentResponse`.

## Real Push Surface

`convex/crons.ts` schedules a daily digest at 13:00 UTC. `convex/reminders.ts` composes today's `scheduleItems` (date-matching + recurrence-matching) into a morning digest and sends via Linq. This is the only currently-active push. The prompt instructs the model to acknowledge it and not invent other pushes.

## Multi-Agent Setup

See [AGENTS.md](AGENTS.md) for shared state between Claude (architecture/reasoning) and Codex (execution/deployment). Codex handoff context is in [docs/codex-handoff.md](docs/codex-handoff.md).
