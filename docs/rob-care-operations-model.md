# Rob Care Operations Model

## Why This Document Exists

This document captures the clearest product truth for CareSupport:

Rob is not a normal productivity user.

Rob is quadriplegic. He uses his nose to interact with his iPhone. Every tap, swipe, message, and correction has physical cost.

He is also the primary coordinator of his own care.

That means CareSupport cannot be designed like a normal dashboard, task manager, or caregiver app. It must be designed as an operational care agent that reduces the number of interactions Rob has to perform.

The product question is not:

> How do we help Rob manage his care better?

The product question is:

> How do we stop forcing Rob to personally coordinate every failure in the care system?

## Rob's Care System

Rob has 12 people on his care team:

- 9 professional caregivers
- 3 family members

The 3 family members are:

- his mother, who has dementia
- his sister, who primarily cares for their mother
- his cousin

The 9 professional caregivers come from 3 separate home care agencies.

Those agencies do not overlap in communication.

That makes Rob the communication bridge between otherwise disconnected care providers.

In practice, Rob is the proxy, dispatcher, historian, escalation system, and schedule operator for his own care.

## The Failure Mode

When a caregiver cancels, is late, or does not show up, Rob has to coordinate the gap himself.

A single cancellation forces him to:

1. Understand which shift is uncovered.
2. Remember who was originally scheduled.
3. Identify which caregivers can perform that type of care.
4. Remember who recently worked.
5. Remember who is likely available.
6. Decide who to contact first.
7. Text or call that person using his nose.
8. Wait for a response.
9. Decide how long to wait.
10. Contact the next person if they do not respond.
11. Repeat the process across caregivers and agencies.
12. Track partial coverage.
13. Update the schedule mentally.
14. Communicate changes to the people involved.
15. Start over if the replacement also falls through.

This can happen multiple times.

This is not simply inconvenient. It is physically expensive, cognitively demanding, emotionally exhausting, and operationally risky.

CareSupport's job is to absorb this coordination burden.

## Core Product Definition

CareSupport is one-to-many.

CareSupport is multiplayer.

CareSupport coordinates on Rob's behalf across the people and organizations involved in his care.

The product is not complete if it only helps Rob remember. The product becomes meaningful when it can maintain communication and coordination until a care need is fulfilled.

## The Job To Be Done

When care falls through, Rob should not have to become the dispatcher.

CareSupport should:

1. Recognize the gap.
2. Determine what needs coverage.
3. Know who is eligible or preferred.
4. Contact the right people in the right order.
5. Track who has responded.
6. Move on when someone does not respond in time.
7. Assemble partial coverage if needed.
8. Update Rob with minimal interaction required.
9. Notify the relevant staff.
10. Update the schedule.
11. Close the loop.

## Interaction Principle

Rob should not have to pull status from CareSupport.

CareSupport should push the right status at the right time.

Because Rob uses his nose to operate his phone, every avoidable interaction matters.

This means:

- Do not require Rob to open dashboards to know what is happening.
- Do not require Rob to repeatedly ask for status.
- Do not make Rob choose from long menus.
- Do not make Rob retype context.
- Do not ask multi-part questions unless absolutely necessary.
- Do not ask for confirmation when the system already has permission and enough context.

CareSupport should only interrupt Rob when:

- a decision is required
- a risk is rising
- a gap is resolved
- the system needs missing information that only Rob can provide
- the status change meaningfully affects his day

## Staff Visibility Principle

Rob's staff also need to know what is going on, but they should not need Rob as the information relay.

CareSupport should provide role-appropriate visibility to each person:

- caregivers see their assigned shifts, changes, handoff notes, and open requests relevant to them
- agencies see requests or confirmations relevant to their staff
- family members see appropriate family-level updates
- Rob sees the operational state and exceptions

The shared visibility model should reduce messages routed through Rob.

## Review Model: Push, Not Pull

The word "review" is dangerous if it implies a dashboard Rob has to inspect.

For Rob, review should mean:

> CareSupport keeps him oriented with short, timely operational updates.

Examples:

```text
Update: tonight 6-10 is still open. I asked Angela 8 minutes ago and will ask Marcus in 2 minutes if she has not replied.
```

```text
Covered: Angela can do 6-8 and Marcus can do 8-10. I updated both of them and marked the gap covered.
```

```text
Still open: no one has confirmed 8-10. I am escalating to Agency B now.
```

```text
I need one decision: Agency C is available, but they would send someone new. Should I accept that if no known caregiver confirms in 10 minutes?
```

## Staff Review Model

Staff should receive simple, role-specific views through text first.

Examples:

### Professional caregiver

```text
CareSupport for Rob: Are you available tonight 6-10? Tasha cancelled. Reply yes, no, or partial with hours.
```

If confirmed:

```text
Confirmed. You are covering Rob tonight 6-10. Handoff: evening routine, transfer support, medication reminder at 8.
```

### Agency coordinator

```text
CareSupport for Rob: Coverage needed tonight 8-10. Angela can cover 6-8. Can your agency fill 8-10?
```

### Family member

```text
CareSupport update: tonight's coverage is handled. Angela has 6-8, Marcus has 8-10.
```

## Status Model

CareSupport needs a compact operational status model.

For each active coordination event, the system should know:

- what happened
- what need is uncovered
- time window
- urgency
- who was originally assigned
- who has been contacted
- who has replied
- who has declined
- who is pending
- who is confirmed
- fallback order
- escalation threshold
- what Rob has been told
- what staff have been told
- whether the loop is closed

This is a stronger concept than a generic reminder or task.

It is a coordination event.

## Proposed Runtime Primitive: Coordination Events

CareSupport needs a first-class primitive for active operational coordination.

Potential table:

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

This may eventually be more appropriate than a generic `openLoops` table because Rob's core problem is not only open loops. It is active coordination under time pressure.

## Supporting Runtime Primitive: Care Contacts

CareSupport also needs a structured care circle directory.

Potential table:

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

Without this, CareSupport cannot reliably coordinate across 12 people.

## The Coverage Gap Loop

The first real multiplayer product loop should be coverage gap resolution.

### Trigger

Rob texts:

```text
Tasha cancelled for tonight.
```

### CareSupport interprets

- Tasha was scheduled tonight.
- The uncovered window is 6-10.
- Rob needs replacement coverage.
- The care circle has 11 possible alternatives, but not all are appropriate.

### CareSupport responds with minimum required interaction

If enough permission exists:

```text
I have Tasha cancelled for tonight 6-10. I am starting coverage outreach now: Angela first, then Marcus, then Agency B.

I will only interrupt you if I need a decision or the gap is not covered in time.
```

If permission is not yet established:

```text
I have Tasha cancelled for tonight 6-10.

I can start by asking Angela, then Marcus, then Agency B. Do you want me to begin outreach in that order?
```

### CareSupport acts

- sends message to Angela
- creates coordination event
- marks Angela pending
- schedules next action if Angela does not reply
- updates Rob only when useful

### Caregiver reply

Angela:

```text
I can do 6-8 but not 8-10.
```

CareSupport:

```text
Confirmed. I have you for 6-8. I am looking for 8-10 coverage now.
```

Rob gets:

```text
Partial coverage: Angela can do 6-8. I am now looking for 8-10.
```

### Completion

Marcus:

```text
I can do 8-10.
```

CareSupport to Marcus:

```text
Confirmed. You are covering Rob tonight 8-10.
```

CareSupport to Rob:

```text
Covered. Angela has 6-8 and Marcus has 8-10. I updated the schedule and closed the gap.
```

## Review Without Hands

Rob's review experience should be optimized for minimal interaction.

Recommended commands:

### Passive updates

CareSupport pushes important state changes automatically.

### One-word / short commands

Rob should be able to text:

```text
status
```

CareSupport:

```text
Tonight: 6-8 covered by Angela. 8-10 still open. Marcus pending. Agency B next in 5 minutes.
```

```text
today
```

CareSupport:

```text
Today: morning covered, afternoon covered, evening gap 8-10 still open. Baclofen reminder at 8.
```

```text
open
```

CareSupport:

```text
Open: tonight 8-10 coverage, PT ride for Tuesday, refill confirmation.
```

```text
who
```

CareSupport:

```text
For tonight's gap: Angela confirmed 6-8, Marcus pending for 8-10, Agency B next.
```

### Voice dictation compatible responses

Responses should be short enough to read aloud by iPhone and easy to understand through speech.

Avoid long bullets unless requested.

## Permission Model

CareSupport should not need Rob's approval for every outreach once trust is established.

But it should earn that trust in stages.

### Stage 1 — Confirm every outbound action

```text
Want me to text Angela?
```

### Stage 2 — Approved playbooks

Rob approves a reusable rule:

```text
When an evening caregiver cancels, ask Angela first, then Marcus, then Agency B.
```

CareSupport can now act without asking every time, but must report.

### Stage 3 — Exception-only interruption

CareSupport starts the playbook automatically and interrupts Rob only when:

- no one responds
- a new/unknown caregiver is proposed
- coverage is partial
- timing is urgent
- the action would violate a known preference

## Staff Should Not Need the App

Professional caregivers and family members should not need to install anything to participate.

They should be able to coordinate through text.

This is especially important because the care team spans multiple agencies and family roles.

CareSupport should become the shared communication layer without requiring agencies to share systems.

## What This Means for the Repo

The repo currently represents the text-native runtime.

The next product architecture direction should prioritize:

1. `careContacts`
2. `coordinationEvents`
3. outbound outreach tracking
4. short status commands
5. permissioned playbooks
6. audit logs for every coordination action
7. schedule updates after confirmed coverage

The prior `openLoops` idea is still useful, but Rob's core scenario suggests a more specific primitive: `coordinationEvents`.

An open loop is unresolved work.

A coordination event is unresolved work plus people, time, urgency, outreach, fallback order, and resolution state.

## Central Product Rule

CareSupport should reduce Rob's touches.

Every feature should be judged by this question:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

If the answer is no, it is probably not central.
