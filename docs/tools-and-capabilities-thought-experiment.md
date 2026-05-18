# Tools and Capabilities Thought Experiment — Rob

## Why Tools Matter

CareSupport cannot become a true family care assistant if it can only talk.

Conversation is the interface, but action is the product.

A text-native care agent without tools is emotionally present but operationally weak. It can listen, summarize, and suggest. But for someone like Rob, the burden is not that he lacks suggestions. The burden is that he has to do the coordination himself.

CareSupport must eventually be able to act across the care environment:

- create and update calendar events
- set reminders and notifications
- text caregivers and family members
- track open loops
- detect coverage gaps
- request confirmations
- update schedules
- escalate when something is not covered
- remember preferences and constraints
- preserve an audit trail

The product promise is not "CareSupport knows what you should do."

The product promise is:

> CareSupport helps carry the work of making care happen.

## Thought Experiment: Rob

Rob is quadriplegic. He has 12 caregivers: 3 family members and 9 professional caregivers across 3 home care agencies. He is the coordinator of his own care.

That means Rob is not merely a recipient of care. Rob is also the operator of a fragile care system that surrounds his body and his daily life.

Imagine Rob's day.

He may wake up already dependent on whether the morning caregiver arrives on time. A missed shift is not an inconvenience. It can change whether he gets out of bed, eats, uses the bathroom, gets medication, makes an appointment, or simply has control over the day.

Every schedule change has a physical consequence.

When someone cancels, Rob has to become the dispatcher.

He has to decide:

- Who should I text first?
- Who is likely available?
- Which agency covers this kind of shift?
- Who already worked too many hours?
- Who needs more notice?
- Who knows my routine well enough?
- Who will say yes but later back out?
- Who should not be asked because of family tension?
- Who can handle the transfer safely?
- Who has the right key, access, or instructions?
- How long do I wait before escalating?
- Do I have to tell the next person the whole context again?

This is not a task list. This is living inside a dependency graph.

The emotional weight is that Rob has to remain calm, precise, persuasive, and organized while the system that supports his day is unstable.

CareSupport should be designed from that reality.

## The Difference Between Advice and Relief

If Rob texts:

```text
Tasha cancelled for tonight. I need coverage from 6-10.
```

A weak assistant says:

```text
You could try reaching out to other caregivers and asking who is available.
```

That is not relief. That is restating the work.

A better assistant says:

```text
I can help. I have Tasha down as cancelled tonight 6-10.

I should ask Angela first, then Marcus, then Agency B, unless you want a different order. Should I start with Angela?
```

A true CareSupport runtime eventually says:

```text
I started coverage outreach for tonight 6-10.

Asked Angela first. If she cannot cover, I will ask Marcus, then Agency B. I will update you as soon as someone confirms.
```

Then later:

```text
Covered. Angela can do 6-8 and Marcus can do 8-10.

I updated tonight's schedule and sent both of them the handoff notes.
```

That is the product.

## Tooling Principle

CareSupport should only claim capabilities it can actually perform.

If a tool is not connected, CareSupport should not pretend.

But the product architecture should be designed around capability growth. The agent should have a clear ladder of action:

1. Remember
2. Remind
3. Draft
4. Ask permission
5. Act
6. Track
7. Escalate
8. Close the loop

Each level requires more trust and more tooling.

## Capability Ladder

### Level 1 — Remember

CareSupport can store durable care context.

Examples:

- Rob prefers Angela for evening coverage.
- Marcus works nights and should not be asked first.
- Agency A handles mornings.
- Tasha usually covers Fridays.

Required substrate:

- `memoryEntries`
- `messages`
- care case context

### Level 2 — Remind

CareSupport can create reminders inside its own runtime.

Examples:

- remind Rob to confirm Monday coverage
- remind family to refill medication
- remind caregiver about an appointment

Required substrate:

- `scheduleItems`
- future notification worker
- message send capability via Linq

### Level 3 — Draft

CareSupport can prepare messages Rob can approve.

Example:

```text
I drafted this for Angela:

"Hey Angela, Tasha cancelled tonight. Are you available 6-10 or any part of it?"

Send it?
```

Required substrate:

- message generation
- approval state
- draft/outreach object

### Level 4 — Ask Permission

CareSupport can recommend action and ask for consent.

Example:

```text
I can ask Angela first because she usually covers evenings. Want me to text her?
```

Required substrate:

- contact directory
- explicit consent capture
- audit log

### Level 5 — Act

CareSupport can send messages, create calendar events, update schedules, and set reminders.

Examples:

- text Angela
- create Google Calendar event
- update shift schedule
- set a reminder
- notify Rob when someone replies

Required integrations:

- Linq outbound messaging
- Google Calendar
- notifications
- possibly Apple/Google reminders later

### Level 6 — Track

CareSupport can maintain open loops.

Examples:

- waiting for Angela
- Marcus replied maybe
- Agency B has not responded
- coverage still open after 20 minutes

Required substrate:

- `openLoops` or equivalent
- status tracking
- scheduled follow-up jobs

### Level 7 — Escalate

CareSupport can follow pre-learned rules when time is running out.

Example:

```text
No one has confirmed tonight 6-10, and the shift starts in 90 minutes.

I am escalating to Agency B and texting Marcus now.
```

Required substrate:

- escalation rules
- urgency thresholds
- permission model
- notification model

### Level 8 — Close the Loop

CareSupport completes the operational cycle.

Example:

```text
Covered. Marcus confirmed 6-10.

I updated the schedule and noted that Tasha cancelled tonight.
```

Required substrate:

- schedule update
- audit log
- outbound confirmation
- memory updates if relevant

## Integration Map

### Messaging

Already core to CareSupport.

Needed capabilities:

- send outbound message
- receive inbound message
- distinguish user vs care contact
- thread messages to an outreach/open loop
- handle delivery failure

### Calendar

Needed for real coordination.

Google Calendar is likely the first practical integration.

Capabilities:

- create event
- update event
- cancel event
- invite attendees
- attach notes / handoff context
- read upcoming events

Important product rule:

CareSupport should not silently modify calendars in early versions. Start permissioned:

```text
I can add this to your calendar. Want me to create it?
```

### Reminders / Notifications

CareSupport needs its own reminder system even before external reminders.

Capabilities:

- schedule reminder
- send reminder via text
- mark reminder complete
- snooze reminder
- escalate missed reminder if appropriate

### Contacts

CareSupport needs a care circle directory.

Capabilities:

- store name
- store phone
- store role
- store relationship
- store availability hints
- store boundaries
- store permission to contact

### Open Loops

This may be the most important missing primitive.

Care coordination is full of unfinished business.

CareSupport needs to know:

- what is unresolved
- who it is waiting on
- when to follow up
- when to escalate
- what the user expects

Potential future table:

```ts
openLoops: defineTable({
  careCaseId,
  createdByUserId,
  type,
  status,
  title,
  description,
  waitingOnContactId,
  dueAt,
  escalationAt,
  sourceMessageId,
  resolution,
  createdAt,
  updatedAt,
})
```

### Audit Log

Every meaningful action should be auditable.

For care, trust comes from knowing what happened.

Examples:

- message sent to Angela
- Angela confirmed
- schedule updated
- reminder created
- calendar event created
- medication-related request blocked pending approval

## What To Build First

Do not start with all integrations.

Start with the smallest tool loop that creates real relief.

Recommended first capability loop:

> Coverage gap support without full automation.

### Phase A — Internal Simulation

CareSupport can:

- understand a cancellation
- identify the open coverage gap
- remember preferred contact order
- draft outreach messages
- ask user for approval before sending
- save an open loop

No third-party calendar required yet.

### Phase B — Permissioned Text Outreach

CareSupport can:

- text one known caregiver with user approval
- track the pending response
- report back to Rob
- update the schedule if confirmed

### Phase C — Calendar / Reminder Sync

CareSupport can:

- create or update calendar events after confirmation
- send reminders before shifts
- notify Rob of unresolved gaps

This avoids overbuilding while moving toward the real product.

## Core Product Rule

CareSupport should not only answer Rob.

CareSupport should reduce the number of things Rob has to personally chase.

If a feature does not reduce Rob's chasing, it is probably not central.

## Updated Central Line

CareSupport does not arrive as an expert in your family.

It becomes useful by learning your family.

And it becomes valuable by acting carefully on what it learns.
