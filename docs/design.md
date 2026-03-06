# CareSupport v2 — Design

## What CareSupport Is

CareSupport is a care coordination agent that texts with family members through iMessage. iMessage is the UI. There is no website or app (aside from a future caresupport.com/start for initial registration).

Each family has a primary coordinator who onboards through CareSupport, then invites their family members and caregivers. CareSupport texts with each person 1:1 and can participate in group chats.

## Three Real Families

### Family A — Kano (5 people)
- **Liban** — coordinator, family caregiver, son
- **Degitu** — care recipient (Liban's mother)
- 3 other family members
- Small, tight-knit. Everyone knows each other.

### Family B — Rob (15 people)
- **Rob** — care recipient AND coordinator (same person)
- 9 professional caregivers (come on shifts, may work for other families too)
- 5-6 family members
- Large, mixed team. Pros need schedules and care tasks. Family needs updates.

### Family C — Amanti (9 people)
- **Amanti** — coordinator, son
- Amanti's mother — care recipient
- 6 remote siblings (can't be physically present, coordinate from afar)
- Distributed. Group chat critical for keeping remote family aligned.

## Design Principles

1. **A person is a person first.** Phone number is identity (iMessage is the UI). One person, one record — even if they're in multiple families.
2. **Role belongs to the membership, not the person.** You're a "professional caregiver" within Rob's family. You might be something else in another family.
3. **Care recipient and coordinator can be the same person.** Rob proves this.
4. **Chats are their own thing.** 1:1 and group chats both exist. Each chat belongs to a family context so CareSupport knows which family's info to use.
5. **Access depends on your role in the family.** Per-membership, not per-person.
6. **The coordinator is the gateway.** They onboard first, then invite others. When in doubt, ask the coordinator.
7. **Keep it simple.** If the LLM can reason, the backend stores what it needs to know — the plumbing.
8. **Preferences are captured, not hardcoded.** Ask the coordinator during onboarding and store their choice. The agent reasons from preferences, not rigid rules.
9. **Proactive by default, opt-out available.** CareSupport defaults to fully engaged (morning summaries, reminders, alerts). Coordinators and members can dial it down.

## Decisions Made

### Permissions: Five levels
- **Full** — see everything, make changes, invite people, approve changes (coordinator gets this by default)
- **Schedule+Meds** — see members, care recipient, schedules, medications, appointments, availability, active issues. Cannot approve changes.
- **Schedule** — see members, schedules, availability, active issues. No medical info.
- **Provider** — see care recipient, medications, appointments, members. Clinical view for healthcare providers.
- **Limited** — see member names only. No care details, no medical info.

The coordinator assigns a level when inviting someone. Can change it later via text. Access levels are stored directly in the database — no mapping layer.

### Multi-family: Deferred
One person belongs to one family for now. A professional caregiver working for multiple families is a future product roadmap item.

### Group chat behavior: Coordinator decides during onboarding
CareSupport asks how the coordinator wants it to behave in group chats. Stored as a preference the agent reasons from.

### Onboarding style: Guided but flexible
CareSupport asks a few key questions upfront (care recipient, relationship, who helps) then learns the rest organically through conversation. Not a form — a conversation.

### Care recipient: Always a record
Every family has a care recipient record, even if they never text (like Degitu). The care recipient is a member with a specific role. If they text (like Rob), they also have a chat.

### Professional caregiver onboarding: Same as everyone
CareSupport introduces itself the same way to all invitees. Learns role-specific details naturally through conversation.

### Invite timing: Ask the coordinator
"Want me to text Ahmed now, or wait until we're done setting up?" Broader principle: when in doubt, ask the coordinator.

### Daily flow: Coordinator chooses
During onboarding, CareSupport asks how proactive to be. Default is fully proactive (morning summaries, shift reminders, gap alerts). Coordinator can opt to reactive only. The goal: let users experience CareSupport's fullness, then choose what they want.

### Medication changes: Always confirm with coordinator
Safety rule, not a preference. Medication changes always require coordinator confirmation, regardless of who reported the change. Exception: if the coordinator themselves reported it, CareSupport updates directly.

### Approval patterns
- **Sensitive changes** (medications, adding/removing members): Always require coordinator confirmation. Hardcoded safety rule.
- **Routine changes** (schedule swaps, task claims, notes): Based on permission level.

### Preferences: Structured fields for code, agent memory for everything else
Two things code needs as structured fields:
- **Timezone** — handler formats timestamps
- **Access level** — enforcement pipeline filters context

Everything else (group chat behavior, communication style, proactive/reactive preference, coordinator instructions) lives in agent-managed context fields:
- Each **family** has a `context` text field (the family.md equivalent)
- Each **member** has a `context` text field (the user.md equivalent)

The agent reads these on every message and updates them when it learns something new.

### How this replaces the current familyContext blob
Current: structured tables → markdown blob → LLM → regex-parse output back onto blob. Fragile.

New: structured tables (members, meds, schedules) assembled into the prompt cleanly + agent-written context fields included as-is. No markdown-to-regex round-trip.

## What Linq Gives Us

- `chat.is_group` boolean on every webhook (group vs 1:1)
- `sender_handle.handle` gives E.164 phone number
- `chat.id` is stable — create once, reuse
- `POST /v3/chats` with `to: [phone1, phone2, ...]` creates group chats
- Participant list needs separate GET call — cache it
- Events: received, delivered, read, failed, reactions, typing indicators

Family identification: store Linq `chat.id` linked to family. Look up on every inbound message. Fallback: sender phone → member → family.

## Memory Model

- **Family context** = structured tables (meds, schedules, members) + agent-written family.context field
- **Per-person context** = agent-written member.context field (communication style, preferences, learned observations)
- **Lessons** = existing corrections system (persists across conversations)

No vector search. No embeddings. Agent reads what it needs from structured tables and context fields. Add retrieval sophistication only when the flat approach fails.

### Emergencies: Notify coordinator + emergency contacts
CareSupport texts the coordinator and designated emergency contacts immediately. Not the whole team. The coordinator decides who else needs to know. Emergency contacts are set during onboarding.

### Handoffs: Deferred
Shift handoff prompts are a future feature. For now, CareSupport tracks who's scheduled and answers questions.

### Chat privacy: Medical info is 1:1 only
Medication details, conditions, and medical notes are never shared in group chats. Groups are for scheduling, logistics, and general coordination. This is a safety rule, not a preference.

### Tasks: Flexible
Both patterns work:
- Coordinator assigns directly: "Sarah takes Tuesday"
- Coordinator posts a need: "Tuesday afternoon is open — who can help?"
CareSupport handles both. Tracks who claimed what, follows up on completion.

### Schedule changes: CareSupport acts directly
When someone asks "Can Sarah do Tuesday instead?" — CareSupport texts Sarah directly to ask. If she confirms, updates the schedule and lets the requester know. CareSupport doesn't need to check with the coordinator for routine schedule swaps (unless the coordinator has set that preference).

### Care recipient medical info: On their member record
Conditions, allergies, emergency protocols, doctor contacts — all live in the care recipient's member context field. The agent reads and writes this. The care recipient is a member with a specific role; their context field is their medical profile.

### Data capture: Structured tables for meds and schedules, context fields for everything else
- **Medications table** — name, dose, schedule, prescriber, status. Code needs this for access control filtering and audit trails.
- **Schedules table** — type, title, date/time, assigned to, status. Code needs this for proactive reminders, gap detection, and access control.
- **Everything else** — agent writes to family.context and member.context fields. Conditions, preferences, observations, protocols, communication notes.
- **No markdown blob.** The handler assembles the prompt from: structured tables (filtered by access level) + context fields (filtered by access level for what sections they contain).

### Agent output format
The agent's structured output includes:
- `medicationUpdates` — typed operations on the medications table
- `scheduleUpdates` — typed operations on the schedules table
- `familyContextUpdate` — text update to the family's context field
- `memberContextUpdate` — text update to the current member's context field
- `smsResponse`, `needsOutreach`, `selfCorrections` — same as current

No more `familyFileUpdates` with regex section targeting.

## Open Questions

(none currently)

## What This Becomes

1. **docs/design.md** — This document, placed in the repo as source of truth
2. **Convex schema** — Backend tables that map to these decisions
3. **Repo cleanup** — README, CLAUDE.md, stale docs updated to match reality
4. **PR for Codex review** — Schema + design doc for second engineer review
