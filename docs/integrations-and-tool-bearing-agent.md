# Integrations And The Tool-Bearing Agent

CareSupport cannot become a true family care coordination runtime if it only
talks. Conversation is the interface, but tools are how work gets done.

This document describes the intended integration architecture at a product level.
It is not a mandate to build all tools immediately.

## Current Status

The active runtime can:

- receive and send iMessage/SMS through Linq
- persist messages, memory, medications, schedule items, and audit logs
- persist care contacts and coordination events as scoped substrate
- load active care contacts and open coordination events into prompt context
- generate structured updates through Claude

The active runtime cannot yet:

- execute external tool actions
- contact third parties on the user's behalf
- create care contacts or coordination events from model output
- sync calendars or email
- track provider-side object IDs
- manage reusable user permissions for actions

## Direction

CareSupport should become a permissioned tool-bearing assistant that can act
across:

- internal reminders
- calendars
- outbound caregiver or agency outreach
- schedule records
- operational status updates
- eventually email

The product test is not "can we integrate another app?" The test is:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

## Runtime Primitives

Expected primitives:

- `toolActions` - lifecycle of an intended or executed action
- `userToolPermissions` - what the user has approved CareSupport to do
- `connectedAccounts` - OAuth or provider connection state
- `externalRefs` - provider-side IDs for calendar events, messages, email
  threads, reminders, or other external objects
- `coordinationEvents` - the operational work that tools are trying to resolve
- `careContacts` - people or organizations that may be contacted or referenced

## Tool Action Lifecycle

A tool action should have explicit state. A likely lifecycle:

- `proposed`
- `permission_required`
- `approved`
- `executing`
- `succeeded`
- `failed`
- `cancelled`
- `reverted` where the provider supports it

The assistant must not say an action succeeded unless the runtime has persisted
success from the relevant provider or internal mutation.

## Permission Model

CareSupport should move through permission stages:

1. Draft only: the agent helps write the message, but the user sends it.
2. Ask every time: the agent proposes a specific action and waits for approval.
3. Approved playbook: the user authorizes a bounded recurring pattern.
4. Exception-only interruption: the agent acts within a narrow policy and
   interrupts only when state is ambiguous, risky, or exhausted.

Rob's coverage-gap workflow should start at stage 2. Stage 3 should only happen
after the system has proven reliability and auditability.

## Provider Shape

Provider adapters should be boring and explicit:

- validate inputs before execution
- execute one external action at a time
- persist provider request and response metadata where useful
- return typed success/failure results
- never hide partial failure
- keep user-visible wording separate from provider error payloads

Likely provider folders:

- `convex/lib/providers/linq/`
- `convex/lib/providers/googleCalendar/`
- `convex/lib/providers/reminders/`
- `convex/lib/providers/gmail/`

## First Integration Order

Recommended order:

1. Internal reminder scheduling.
2. Google Calendar read/write for appointments and coverage windows.
3. Linq-backed outbound outreach to approved care contacts.
4. Operational status summaries for open coordination events.
5. Gmail only after there is a real coordination loop that needs it.

Do not add integrations because they are broadly useful. Add them when they
close a specific care coordination loop.
