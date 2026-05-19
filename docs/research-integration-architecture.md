# Research — Integration Architecture for a Tool-Bearing Care Agent

## Purpose

This document captures the practical integration architecture for CareSupport as a tool-bearing care agent.

The product question came from Rob directly:

> Can CareSupport create an event for me? Can it add it to my calendar? Can it update my information?

That question defines the gap between a message assistant and an operational care agent.

If CareSupport only replies in the message thread, Rob still has to do half the work. He still has to open apps, create events, update details, set reminders, text people, and manage follow-up. Because Rob uses his nose to operate his iPhone, every extra interaction has physical cost.

CareSupport should not make Rob leave the thread to finish the work.

Conversation is the interface. Tools are how the work gets done.

## Current Runtime Status

The active runtime can persist `careContacts` and `coordinationEvents` as scoped
care-case substrate and load active contacts plus open coordination events into
prompt context.

It cannot yet create those records from model output, execute external tool
actions, contact third parties, sync calendars/email, or manage reusable tool
permissions.

Research should not directly expand assistant claims. If research shows users
want CareSupport to text caregivers or update calendars, the repo still needs
schema support, permission checks, action lifecycle records, provider execution,
failure handling, tests, and audit logs before the assistant may claim the work
was done.

## What Products Like Poke-Style Assistants Generally Need

The exact internal stack of products like Poke is not reliably public. Do not assume their specific vendor or implementation.

The common architecture for a personal or family agent with integrations is:

```text
user permission / OAuth
  -> provider API or integration platform
  -> tool registry
  -> agent planner
  -> action executor
  -> persistence / audit
  -> confirmation back to user
```

For CareSupport, the same pattern applies, but with stricter safety, visibility, and operational reliability because care coordination affects real daily support.

## Google Calendar and Gmail

Google Calendar and Gmail are typically integrated through Google OAuth and Google APIs.

Flow:

```text
User connects Google
  -> Google OAuth consent
  -> user grants scopes
  -> app stores provider account state and refresh-token metadata securely
  -> backend calls Google Calendar API or Gmail API
  -> app stores external references and audit/tool logs
  -> CareSupport confirms the action by text
```

CareSupport should use the smallest scopes possible and should not request Gmail access until there is a clear use case.

Recommended order:

1. Google Calendar create/update/read
2. Internal reminders and SMS notifications
3. Care contacts and coordination events
4. Permissioned caregiver outreach
5. Gmail read/search/draft later

## Native iOS Calendar

Native iOS calendar access usually requires an installed iOS app using Apple EventKit.

For the current CareSupport runtime, which is SMS/iMessage-first and backend-driven, the better first path is cloud calendar integration.

If Rob uses Google Calendar synced to his iPhone, then:

```text
CareSupport -> Google Calendar API -> event appears in iPhone Calendar
```

This gives Rob the outcome without requiring a native iOS app first.

Native iOS EventKit can be considered later if CareSupport ships a companion iOS app.

## Direct API vs Integration Platform

CareSupport has three realistic implementation paths.

### Path 1 — Direct Provider APIs

Build directly against Google OAuth, Google Calendar API, Gmail API, and later other providers.

Pros:

- maximum control
- clearer data boundaries
- easier to align with care-specific safety rules
- better auditability
- less third-party processing of sensitive care context

Cons:

- slower to build
- more maintenance burden
- token lifecycle and provider quirks must be handled internally

### Path 2 — Integration Platforms

Use platforms that provide OAuth/connectors and normalize APIs across providers.

Examples of the category:

- Nylas
- Nango
- Composio
- Pipedream
- Merge
- Zapier-style automation layers

Pros:

- faster connector setup
- less OAuth plumbing
- easier multi-provider expansion

Cons:

- extra vendor in sensitive care data flow
- trust/compliance review required
- potential mismatch with care-specific audit and permissions model
- less direct control over failure modes

### Path 3 — MCP / Tool Servers

Use MCP or tool-server style connectors for agent-accessible tools.

Pros:

- strong fit for prototyping agent tools
- clean tool abstraction
- reusable tool calls

Cons:

- may not be production-grade for Rob's reliability needs
- often developer-oriented
- must still solve OAuth, permissions, audit, and hosted execution

Recommendation:

Use an internal tool abstraction layer in CareSupport regardless of whether the first provider is direct API, integration platform, or MCP.

The agent should call CareSupport tools, not raw Google APIs from prompts.

## Recommended CareSupport Integration Architecture

```text
CareSupport Runtime
  Convex backend
  Linq SMS/iMessage gateway
  Anthropic/LLM reasoning layer

Tool Registry
  calendar.create_event
  calendar.update_event
  calendar.cancel_event
  calendar.read_events
  reminder.create
  reminder.update
  messaging.send
  contacts.create_or_update
  coordination_event.create
  coordination_event.update
  email.search
  email.draft

Provider Adapters
  Google Calendar adapter
  Gmail adapter
  Linq messaging adapter
  internal reminder adapter
  future iOS/EventKit app adapter

Persistence
  connectedAccounts
  externalRefs
  toolActions
  userToolPermissions
  careContacts
  coordinationEvents
  auditLogs

UX Feedback
  short SMS confirmation
  status updates
  failure messages
  correction path
```

## Proposed File Structure

```text
convex/lib/tools/
  toolRegistry.ts
  toolPermissions.ts
  toolActions.ts
  calendarTool.ts
  reminderTool.ts
  messagingTool.ts
  contactsTool.ts
  emailTool.ts

convex/lib/providers/google/
  oauth.ts
  calendar.ts
  gmail.ts

convex/lib/coordination/
  coordinationEvents.ts
  coverageGap.ts
  statusSummaries.ts

convex/lib/knowledge/
  knowledgeSnapshot.ts
  knowledgeDisclosure.ts
```

## Runtime Tool Flow

Every tool action should follow the same flow:

1. User asks for something.
2. Intent/router identifies whether a tool can help.
3. Runtime builds a knowledge snapshot.
4. Runtime checks whether required context exists.
5. Runtime checks tool availability.
6. Runtime checks permission level.
7. Runtime either acts, asks permission, or asks one missing question.
8. Tool executes.
9. Result is persisted.
10. External reference is stored if needed.
11. Tool action/audit log is written.
12. CareSupport sends a short confirmation or failure message.

## Example: Calendar Event Creation

Rob:

```text
Add PT next Tuesday at 2.
```

If Google Calendar is connected and permission exists:

```text
Added PT to your calendar for next Tuesday at 2. Reminder set for 90 minutes before.
```

Runtime actions:

- parse event details
- apply Rob's default transfer-time reminder if known
- create or update `scheduleItems`
- call `calendar.create_event`
- store `externalRefs`
- write `toolActions`
- write `auditLogs`
- send confirmation via Linq

If first time using calendar:

```text
I can add PT to your calendar. Should I create it for next Tuesday at 2 with your usual transfer-time reminder?
```

If calendar is not connected:

```text
I do not have calendar access yet. I saved PT for next Tuesday at 2 here and can remind you by text.
```

CareSupport must never claim an external action succeeded unless the provider returned success.

## Example: Contact Update

Rob:

```text
Angela has a new number.
```

CareSupport:

```text
Send me Angela's new number and I'll update her contact.
```

Rob:

```text
612-555-0198
```

CareSupport:

```text
Updated Angela's number. I will use this for future coverage outreach.
```

Runtime actions:

- update `careContacts`
- preserve previous value if needed
- write `toolActions` or `auditLogs`
- confirm by text

## Example: Coverage Gap With Tool Use

Rob:

```text
Tasha cancelled tonight.
```

CareSupport should not make Rob chase the care circle manually.

If enough context and permission exist:

```text
I have Tasha cancelled for tonight 6-10. I am starting coverage outreach now: Angela first, then Marcus, then Agency B.

I will only interrupt you if I need a decision or the gap is not covered in time.
```

Runtime actions:

- create `coordinationEvents` record
- identify affected `scheduleItems`
- load `careContacts` and preferred fallback order
- send outreach to first contact
- mark first contact pending
- schedule follow-up/escalation
- send Rob status only when useful

If permission is not established:

```text
I have Tasha cancelled for tonight 6-10.

I can start by asking Angela, then Marcus, then Agency B. Do you want me to begin outreach in that order?
```

## Permission Progression

CareSupport should earn action rights gradually.

```text
ask every time
  -> approved playbook
  -> auto-with-exceptions
```

### Ask Every Time

```text
Want me to text Angela?
```

### Approved Playbook

```text
When an evening caregiver cancels, ask Angela first, then Marcus, then Agency B.
```

### Auto-With-Exceptions

CareSupport starts the known playbook and interrupts Rob only when:

- coverage is still open near the deadline
- an unknown caregiver is proposed
- the available caregiver is outside known preferences
- the result is partial coverage
- a high-risk decision is required

## Data Model Additions

The current schema supports users, care cases, messages, medications, schedule items, memory entries, and audit logs.

A tool-bearing, one-to-many CareSupport likely needs additional primitives.

### connectedAccounts

Tracks provider connections.

```ts
connectedAccounts: defineTable({
  userId: v.id("users"),
  provider: v.union(
    v.literal("google_calendar"),
    v.literal("gmail"),
    v.literal("apple_calendar"),
    v.literal("apple_reminders"),
  ),
  status: v.union(
    v.literal("connected"),
    v.literal("expired"),
    v.literal("revoked"),
    v.literal("error"),
  ),
  scopes: v.array(v.string()),
  connectedAt: v.number(),
  updatedAt: v.number(),
})
```

### externalRefs

Maps local CareSupport records to provider objects.

```ts
externalRefs: defineTable({
  careCaseId: v.id("careCases"),
  localTable: v.string(),
  localId: v.string(),
  provider: v.string(),
  externalId: v.string(),
  externalUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### toolActions

Records proposed, approved, executed, failed, or cancelled tool actions.

```ts
toolActions: defineTable({
  careCaseId: v.optional(v.id("careCases")),
  userId: v.optional(v.id("users")),
  toolName: v.string(),
  action: v.string(),
  status: v.union(
    v.literal("proposed"),
    v.literal("approved"),
    v.literal("executed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),
  inputSummary: v.optional(v.string()),
  resultSummary: v.optional(v.string()),
  error: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### userToolPermissions

Stores capability-specific permission levels.

```ts
userToolPermissions: defineTable({
  userId: v.id("users"),
  careCaseId: v.id("careCases"),
  capability: v.string(),
  permissionLevel: v.union(
    v.literal("ask_every_time"),
    v.literal("approved_for_playbook"),
    v.literal("auto_with_exceptions"),
  ),
  conditions: v.optional(v.string()),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### careContacts

Structured people and organizations around the care case.

```ts
careContacts: defineTable({
  careCaseId: v.id("careCases"),
  name: v.string(),
  phone: v.optional(v.string()),
  relationship: v.optional(v.string()),
  contactType: v.union(
    v.literal("family"),
    v.literal("professional_caregiver"),
    v.literal("agency"),
    v.literal("clinician"),
    v.literal("other"),
  ),
  agencyName: v.optional(v.string()),
  role: v.optional(v.string()),
  notes: v.optional(v.string()),
  availabilityNotes: v.optional(v.string()),
  contactPriority: v.optional(v.number()),
  canReceiveTexts: v.boolean(),
  consentToContact: v.optional(v.boolean()),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### coordinationEvents

First-class operational coordination objects.

```ts
coordinationEvents: defineTable({
  careCaseId: v.id("careCases"),
  createdByUserId: v.optional(v.id("users")),
  type: v.union(
    v.literal("coverage_gap"),
    v.literal("late_caregiver"),
    v.literal("ride_gap"),
    v.literal("appointment_change"),
    v.literal("medication_followup"),
    v.literal("general_coordination"),
  ),
  status: v.union(
    v.literal("open"),
    v.literal("in_progress"),
    v.literal("waiting"),
    v.literal("partially_resolved"),
    v.literal("resolved"),
    v.literal("cancelled"),
    v.literal("escalated"),
  ),
  title: v.string(),
  description: v.optional(v.string()),
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  urgency: v.optional(v.union(
    v.literal("low"),
    v.literal("normal"),
    v.literal("high"),
    v.literal("critical"),
  )),
  originalAssigneeContactId: v.optional(v.id("careContacts")),
  confirmedContactIds: v.optional(v.array(v.id("careContacts"))),
  pendingContactIds: v.optional(v.array(v.id("careContacts"))),
  declinedContactIds: v.optional(v.array(v.id("careContacts"))),
  fallbackOrderContactIds: v.optional(v.array(v.id("careContacts"))),
  nextActionAt: v.optional(v.number()),
  escalationAt: v.optional(v.number()),
  lastUserUpdateAt: v.optional(v.number()),
  resolution: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
```

## Build Order Recommendation

Do not start with Gmail.

Start with the smallest useful tool-bearing loop.

### Phase 1 — Internal Tooling Foundation

- tool registry
- tool permission checks
- tool action audit logs
- care contact update tool
- schedule item update tool
- internal reminder tool

### Phase 2 — Google Calendar Create/Update

- OAuth connection
- connectedAccounts
- calendar.create_event
- calendar.update_event
- externalRefs
- short confirmation messages
- failure handling

### Phase 3 — Coordination Events and Coverage Gap Relief

- careContacts
- coordinationEvents
- permissioned outbound outreach
- pending/confirmed/declined response tracking
- short status commands: status, today, open, who

### Phase 4 — Gmail Later

- connect Gmail
- search appointment emails
- extract dates/times/locations
- draft agency emails
- ask permission before send

### Phase 5 — Approved Playbooks

- reusable rules
- default tool permissions
- exception-only confirmation
- automatic coordination under learned constraints

## Final Rule

CareSupport should not make Rob leave the thread to finish the work.

If CareSupport has enough context, permission, and tooling, it should complete the action and report back.
