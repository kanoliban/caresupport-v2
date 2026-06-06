# Multiplayer Runtime Architecture

Status: current code contract. Production activation still requires deploying
the latest Convex functions before the generic preflight commands can pass.

## Purpose

This document defines how CareSupport ties one-to-many text coordination back to
one care graph without turning every caregiver into an app user.

The core rule is care-case scope:

```text
primary coordinator user
  -> careCase
    -> careContacts
    -> coordinationEvents
    -> outreachAttempts
    -> messages and auditLogs linked by ids
```

## Identity Model

The primary coordinator is a `users` row. They are the person who starts the
trusted thread, narrates the care situation, and approves outreach.

The care situation is a `careCases` row. It is the boundary for current truth,
relationship graph state, coordination state, messages, and audit records.

Caregivers, family helpers, agencies, providers, drivers, neighbors, and other
participants are `careContacts` scoped to the care case. They are not app users
by default and their phone numbers are not attached to the primary
coordinator's `userId`.

For Rob, this means:

```text
Rob = users row
Rob's care situation = careCases row
Jim, Jennifer, Sarah, etc. = careContacts rows scoped to Rob's careCaseId
```

## Coordination Model

A care need, coverage gap, handoff, schedule check, or follow-up is a
`coordinationEvents` row scoped to the same `careCaseId`.

The event holds coordination state:

- who is pending
- who confirmed
- who declined
- what reply arrived last
- what follow-up is due next
- whether the event is still open, waiting, resolved, or cancelled

This keeps schedule coordination as an agent-led state machine rather than a
large manual scheduling UI.

## Outreach Model

When the coordinator asks CareSupport to involve another person, CareSupport
must:

1. Create or update the relevant `careContact`.
2. Create or update the relevant `coordinationEvent`.
3. Propose one exact outreach message to one exact contact.
4. Ask for explicit primary-coordinator approval.
5. Let runtime code persist and execute only after approval.

Approved outreach is represented by an `outreachAttempts` row linking:

- `careCaseId`
- `coordinationEventId`
- `careContactId`
- `requestedByUserId`
- `approvedByUserId`
- `messageBody`
- `linqChatId`
- `linqMessageId`
- status and follow-up timestamps

Approval is not global permission. It is one exact message, to one exact
contact, for one care case and coordination event.

## Reply Tie-Back

Care contact replies are tied back in this order:

1. Resolve by `linqChatId` on a sent `outreachAttempt`.
2. Resolve by `linqChatId` on the `careContact`.
3. Resolve by phone only when exactly one active `careContact` with that phone
   has a sent outreach attempt.
4. Fall back to unknown-user onboarding only when the reply cannot be safely
   tied to an existing care contact.

This prevents a caregiver reply from creating an unrelated primary user or care
case when it belongs inside an existing coordinator's care graph.

When a reply is resolved, the inbound message is stored with:

- `careCaseId`
- `userId` of the primary coordinator for that care case
- `careContactId`
- `coordinationEventId`
- `outreachAttemptId`

Then the event and contact are updated from the reply:

- clear yes -> confirmed
- clear no -> declined
- partial availability -> availability/context note, not false confirmation
- deferred reply -> follow-up clock
- wrong number / stop texting -> deactivate text outreach for that contact

## Runtime Capability

Current code can:

- create care contacts from structured model output
- create coordination events from structured model output
- propose and persist pending outreach attempts
- detect exact primary-coordinator approval
- send approved one-to-one outreach through Linq
- map care contact replies back to the correct care graph
- update contact and coordination-event state from replies
- audit request, approval, send, failure, and reply events
- send the coordinator a status update when useful

Current code does not yet provide:

- group chats as a coordination workspace
- caregiver app accounts or dashboards
- broad caregiver permission systems
- Google Calendar, Gmail, or external tool sync
- a finished web/iOS companion coordination view
- autonomous outreach without exact approval

## Production Activation

Production activation does not require seeding.

A private-beta coordinator should onboard normally over text, add at least one
care contact and one coordination need conversationally, approve one exact
outreach, and have that contact reply. The generic preflight/verifier then
prove that messages, contact state, event state, outreach state, and audit
evidence all remain inside the same care graph.

Rob remains the launch stress test and simulator case. Rob-specific fixtures may
be useful for regression tests, but they are not the activation architecture.
