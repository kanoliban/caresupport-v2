# Integrations and the Tool-Bearing Agent

## Why This Matters

Rob asked the essential product question:

> Can CareSupport create an event for me? Can it add it to my calendar? Can it update my information?

That question exposes the difference between a message assistant and an operational agent.

If CareSupport only tells Rob what to do, the message thread still leaves him doing half the work. For Rob, that work has a physical cost. He uses his nose to operate his iPhone. Every extra tap, text, app switch, calendar edit, and confirmation is part of the burden CareSupport is supposed to reduce.

CareSupport must become tool-bearing.

Conversation is the interface.

Tools are how the work gets done.

## Core Principle

CareSupport should not stop at:

> I can remind you to add this to your calendar.

CareSupport should move toward:

> I added it to your calendar and will remind you before it starts.

The goal is not to make Rob aware of the next task. The goal is to complete the task when permission, context, and capability exist.

## The Problem With Thread-Only CareSupport

A text-only CareSupport can say:

```text
Your appointment is next Tuesday at 2.
```

But Rob may still have to:

1. Open Calendar.
2. Create an event.
3. Type the appointment name.
4. Enter the date.
5. Enter the time.
6. Add location.
7. Add travel or transfer time.
8. Set a reminder.
9. Notify a caregiver.
10. Remember to confirm the ride.

For Rob, that is not a small amount of work.

CareSupport should collapse those steps into one text exchange.

## What Tool-Bearing Means

A tool-bearing CareSupport can:

- create calendar events
- update calendar events
- cancel calendar events
- add attendees
- create reminders
- send notifications
- text caregivers
- save and update care records
- update coordination events
- track pending replies
- send follow-up messages
- produce short status summaries
- audit what happened

The agent should not merely talk about the care system. It should operate inside it.

## Capability Difference

### Message Assistant

```text
Rob: Add my PT appointment next Tuesday at 2.

CareSupport: Got it. You should add your PT appointment to your calendar for next Tuesday at 2.
```

This is not enough.

### Memory Assistant

```text
CareSupport: I will remember that your PT appointment is next Tuesday at 2.
```

Better, but still incomplete.

### Tool-Bearing Agent

```text
CareSupport: Added PT for next Tuesday at 2 to your calendar. I included transfer time and set a reminder for 90 minutes before.
```

This is the target direction.

## Permissioned Tool Use

CareSupport should not silently gain broad powers.

Tool use should be permissioned, observable, and reversible where possible.

The trust model should evolve in stages.

### Stage 1 — Ask Every Time

```text
I can add this to your calendar. Want me to create the event?
```

### Stage 2 — Remember Preferences

```text
Got it. For PT appointments, include 30 minutes of transfer time and remind you 90 minutes before.
```

### Stage 3 — Approved Playbooks

```text
From now on, when you give me an appointment date and time, I can add it to your calendar with your default reminder unless you say otherwise.
```

### Stage 4 — Exception-Only Confirmation

```text
I added it to your calendar. I only need you if the time, location, or ride details are missing.
```

## The Tool Boundary

CareSupport should always know which tools are actually available.

It must not pretend to create events, send messages, or update records if the integration is unavailable or fails.

Correct:

```text
I do not have calendar access yet. I saved the appointment here and can remind you by text.
```

Incorrect:

```text
Done, I added it to your calendar.
```

when no calendar tool is connected.

## Priority Integrations

### 1. Messaging / Linq

This is the core integration because CareSupport is one-to-many through text.

Capabilities:

- send outbound text/iMessage
- receive replies
- associate replies with coordination events
- send confirmations
- notify Rob
- message staff without requiring app installs

### 2. Calendar

Calendar is the first obvious tool Rob asked for.

Likely first provider:

- Google Calendar

Capabilities:

- create event
- update event
- cancel event
- add attendees
- read upcoming events
- attach notes
- set reminders

Calendar actions should produce audit logs and short confirmation texts.

Example:

```text
Added: PT appointment Tuesday at 2. Reminder set for 12:30 so you have transfer time.
```

### 3. Reminders / Notifications

CareSupport needs an internal reminder engine even if external reminders are not connected.

Capabilities:

- create reminder
- schedule outbound text reminder
- mark reminder complete
- snooze reminder
- escalate if missed or urgent

Example:

```text
I will remind you tomorrow at 9 AM to confirm Friday coverage.
```

### 4. Contacts / Care Circle

CareSupport needs structured people it can act on.

Capabilities:

- store caregiver/family/agency contacts
- know who can receive texts
- know permission state
- know roles and boundaries
- use priority order for outreach

### 5. Email / Gmail

Gmail may matter for agencies, clinicians, appointment confirmations, and paperwork.

Capabilities:

- find appointment emails
- detect schedule changes
- summarize care-related email
- draft or send email with permission
- extract date/time/location into calendar events

This is powerful but should likely come after calendar + messaging because Rob's immediate operational pain is text and schedule coordination.

## Integration Architecture

CareSupport should have a tool abstraction layer rather than baking external APIs directly into prompts.

Recommended structure:

```text
convex/lib/tools/
  calendarTool.ts
  reminderTool.ts
  messagingTool.ts
  contactsTool.ts
  emailTool.ts
  toolRegistry.ts
  toolPermissions.ts
```

Each tool should expose:

- capability name
- availability status
- required permissions
- input schema
- output schema
- failure modes
- audit log payload

Example capability names:

```text
calendar.create_event
calendar.update_event
calendar.cancel_event
reminder.create
messaging.send
contacts.create_or_update
coordination_event.create
coordination_event.update
email.search
email.draft
```

## Tool Use Flow

Every tool action should pass through the same runtime flow:

1. User asks for something.
2. CareSupport determines intent.
3. CareSupport checks required context.
4. CareSupport checks tool availability.
5. CareSupport checks permission level.
6. CareSupport either acts, asks permission, or asks one missing question.
7. Tool executes.
8. Runtime persists result.
9. Audit log records action.
10. CareSupport sends a short confirmation.

## Example: Calendar Event Creation

Rob:

```text
Add PT next Tuesday at 2.
```

CareSupport checks:

- Does it know Rob's calendar connection?
- Does it know timezone?
- Does it know default reminder preference?
- Does it know if transfer time should be included?
- Does it have permission to create calendar events?

If first time:

```text
I can add that to your calendar. Should I create PT for next Tuesday at 2 with your usual transfer-time reminder?
```

If permission already exists:

```text
Added PT for next Tuesday at 2. I included your usual transfer-time reminder.
```

If missing date ambiguity:

```text
I can add it. Which Tuesday do you mean: May 19 or May 26?
```

If calendar not connected:

```text
I do not have calendar access yet. I saved PT for next Tuesday at 2 here and can remind you by text.
```

## Example: Updating Information

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

- update careContacts
- preserve prior value if needed for audit/history
- log update
- confirm to Rob

## Example: Complete Appointment Loop

Rob:

```text
I have wound care Thursday at 11 at Abbott.
```

CareSupport:

```text
I can add wound care Thursday at 11 at Abbott, include transfer time, and remind you 90 minutes before. Want me to create it?
```

Rob:

```text
yes
```

CareSupport:

```text
Added. Wound care is on your calendar Thursday at 11 at Abbott. Reminder set for 9:30.

Do you want me to check who can drive?
```

If yes, CareSupport creates a coordination event for ride coverage.

## Tool Use and Rob's Physical Cost

Every tool should be judged by touch reduction.

Question:

> Does this save Rob from opening another app, typing another message, remembering another detail, or chasing another person?

If yes, it is central.

If no, it is probably secondary.

## Data Model Implications

Tool-bearing CareSupport likely needs these primitives:

### connectedAccounts

Stores OAuth/provider connection state.

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

Maps CareSupport records to external systems.

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

Audits attempted and completed tool calls.

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

Stores approved playbooks and tool permissions.

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

## Security and Safety

CareSupport needs strong boundaries because tools can affect real life.

Rules:

- Never claim a tool action succeeded unless the tool returned success.
- Record every external action in audit/tool logs.
- Ask permission before first use of a sensitive tool.
- Give users simple ways to correct, cancel, or revoke permissions.
- Do not send medical details to third parties unless permission and access rules allow it.
- Use minimum necessary information in outreach messages.
- Treat medication changes as higher-risk than ordinary calendar events.

## Build Order

Do not begin with Gmail.

Recommended sequence:

### Phase 1 — Internal Tooling Foundation

- tool registry
- tool permissions model
- tool action audit log
- internal reminder creation
- care contact updates
- schedule item updates

### Phase 2 — Calendar Create/Update

- Google Calendar OAuth
- create event
- update event
- externalRefs mapping
- confirmation messages
- tests for success/failure

### Phase 3 — Coverage Coordination Tools

- careContacts
- coordinationEvents
- permissioned outbound messaging
- response tracking
- partial coverage handling

### Phase 4 — Gmail Read/Draft

- connect Gmail
- search care-related email
- extract appointment data
- draft email replies
- ask permission before sending

### Phase 5 — Approved Playbooks

- reusable rules
- default permissions
- exception-only confirmation
- automatic coordination under learned constraints

## First Useful Integration Demo

The first integration demo should be simple and concrete:

Rob texts:

```text
Add PT next Tuesday at 2.
```

CareSupport replies:

```text
Added PT to your calendar for next Tuesday at 2. I set a reminder for 90 minutes before.
```

If calendar is not connected:

```text
I do not have calendar access yet. I saved PT for next Tuesday at 2 here and can remind you by text.
```

This demo proves the difference between chat and action.

## Central Line

CareSupport should not make Rob leave the thread to finish the work.

If the agent has enough context, permission, and tooling, it should complete the action and report back.
