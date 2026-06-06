# Product Roadmap

Last updated: 2026-06-06

## Current State

CareSupport is a family care agent currently implemented through a solo-thread
wedge that can expand into permissioned one-to-one outreach.

The active product path is:

- one primary coordinator
- one care case
- one trusted coordinator text thread
- memory, medications, schedule items, care contacts, coordination events,
  outreach attempts, messages, and audit logs
- approved one-to-one outreach through Linq
- care contact replies mapped back to the same care graph

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
- runtime limits remain honest: approved Linq outreach exists; external tools,
  group chats, and broad permission systems do not

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

Prepare and activate the first narrow multiplayer loop.

`careContacts`, `coordinationEvents`, and `outreachAttempts` are in schema,
scoped by care case, covered by tests, and used by the prompt/runtime loop.

### Required outcomes

- care-contact model is designed around a care case
- coordination-event model is designed around open operational work
- outreach attempts require exact approval before send
- care contact replies map back to the same care graph
- status summaries describe what is known, missing, and still open
- tests prevent false claims of completed outreach or external tool work

Started primitives:

- `careContacts`
- `coordinationEvents`
- `outreachAttempts`

Still candidate:

- `externalRefs`

## Phase 3 - Permissioned Tools

Add tool-bearing behavior behind explicit permission and audit state.

### First likely tools

- internal reminders
- Google Calendar read/write
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
4. CareSupport asks permission to start exact one-to-one outreach.
5. CareSupport contacts approved people or agencies through Linq.
6. CareSupport tracks pending, declined, partial, and confirmed replies inside
   the same care graph.
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
