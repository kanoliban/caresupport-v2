# Product Roadmap

Last updated: 2026-05-19

## Current State

CareSupport is a family care agent currently implemented through a solo-thread
wedge.

The active product path is:

- one trusted user
- one care case
- one persistent text thread
- memory, medications, schedule items, and audit logs
- no outbound outreach or external tool execution yet

The product direction is:

- multiplayer family care coordination
- one-to-many care orchestration
- permissioned tools
- push-not-pull operational updates
- coverage-gap and handoff coordination

## Phase 0 - Direction Alignment

Make the repo internally consistent so future work does not inherit the stale
"solo caregiver app" identity.

### Required outcomes

- README, CLAUDE, SOUL, and design docs describe CareSupport as a family care
  agent
- solo-thread behavior is framed as the wedge and active implementation mode
- docs name future runtime primitives without overbuilding code
- runtime limits remain honest: no outreach/tools until permissions and audits
  exist

## Phase 1 - Core First-Thread Loop

Keep proving that one trusted thread can learn the care situation and become
useful quickly.

### Must be great at

- onboarding into a care case
- capturing medications
- tracking appointments, tasks, rides, and routines
- remembering personal care context and communication preferences
- showing what it knows when it matters
- correcting memory cheaply

### Success metrics

- first-value completion
- weekly retained users
- messages per retained user
- percentage of users with at least one medication, appointment, task, or memory
  saved
- number and shape of requests for outreach, scheduling, or multiplayer help

## Phase 2 - Contact And Coordination Substrate

Prepare for multiplayer without yet automating outreach.

Initial substrate exists as of the runtime alignment pass: `careContacts` and
`coordinationEvents` are in schema, scoped by care case, covered by tests, and
loaded into prompt context when present. Remaining Phase 2 work is model-write
path, summaries, and product-loop hardening.

### Required outcomes

- care-contact model is designed around a care case
- coordination-event model is designed around open operational work
- prompt language can identify coverage gaps and handoffs without claiming it
  contacted anyone
- status summaries can describe what is known, missing, and still open
- tests prevent false claims of completed outreach or tool work

Started primitives:

- `careContacts`
- `coordinationEvents`

Still candidate:

- `externalRefs`

## Phase 3 - Permissioned Tools

Add tool-bearing behavior behind explicit permission and audit state.

### First likely tools

- internal reminders
- Google Calendar read/write
- Linq-backed outbound outreach to approved contacts
- operational status summaries for open coordination events

### Required outcomes

- `toolActions` or equivalent persisted action lifecycle
- `userToolPermissions` or equivalent permission model
- provider adapters with failure handling
- audit records for user-visible and external actions
- no assistant claim of tool success unless the tool actually succeeded

## Phase 4 - Coverage Gap Coordination

Build the first true multiplayer loop.

### Target loop

1. User reports a cancellation or uncovered shift.
2. CareSupport identifies the affected time window.
3. CareSupport uses known contacts and fallback order.
4. CareSupport asks permission to start outreach.
5. CareSupport contacts approved people or agencies.
6. CareSupport tracks pending, declined, partial, and confirmed replies.
7. CareSupport escalates when needed.
8. CareSupport pushes short status updates.
9. CareSupport records the resolution.

This phase proves CareSupport can coordinate work, not only remember it.

## Phase 5 - Broader Family Runtime

Expand from one trusted thread into family and professional caregiver
coordination.

Likely work:

- group chat handling
- family and professional caregiver roles
- access and visibility rules
- reusable playbooks
- exception-only interruption
- richer connected accounts
- Gmail support if it reduces operational coordination burden
