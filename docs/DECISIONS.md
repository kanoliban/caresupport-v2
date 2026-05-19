# Product Decisions

This file records durable product decisions for the active CareSupport product.

## 2026-05-19 - Reframe CareSupport As A Multiplayer Family Care Runtime

### Decision

CareSupport's product direction is a multiplayer, one-to-many family care
coordination runtime.

The solo-thread experience remains active as the wedge and current
implementation mode, but it is no longer the final product identity.

### What this means

CareSupport should be described as:

- a family care agent
- a text-native operational coordination runtime
- a one-to-many care orchestration system
- a tool-bearing assistant that can eventually act across calendars, reminders,
  outreach, schedules, and coordination events

The solo thread is still valuable as:

- the first relationship
- onboarding
- trusted narration
- memory-building
- the safest way to prove reliability before outreach and tools

### Why

The sharper product model is Rob.

Rob is quadriplegic, uses his nose to operate his iPhone, and coordinates 12
people himself across family, professional caregivers, and disconnected
agencies. A solo assistant that only remembers facts still leaves Rob as the
dispatcher.

CareSupport becomes meaningfully different when it reduces the number of times
Rob has to chase coordination.

### Runtime implications

The current schema remains the active implementation foundation:

- `users`
- `careCases`
- `messages`
- `medications`
- `scheduleItems`
- `memoryEntries`
- `auditLogs`

Future multiplayer/tool-bearing work should extend from this foundation with
deliberate primitives such as:

- `careContacts`
- `coordinationEvents`
- `toolActions`
- `connectedAccounts`
- `externalRefs`
- `userToolPermissions`

Do not reintroduce the old v1 `families`/`members`/access-tier model by
compatibility drift. If multiplayer data is added, design the current schema
boundary explicitly and enforce care-case or family isolation mechanically.

### Operational consequence

Docs, prompts, and future architecture should distinguish:

- **active now:** one trusted text thread, memory, medications, schedule items,
  audit logs
- **wedge:** solo relationship that teaches CareSupport the care situation
- **direction:** permissioned one-to-many coordination and tool action

The runtime should remain solo-safe until permissioned outreach, provider
adapters, action logging, and tests exist.

### Supersedes

This supersedes the product-identity portion of the 2026-04-13 solo-beta
decision. The 2026-04-13 schema decision remains true as current implementation
status, but not as the long-term product category.

## 2026-04-13 — Pivot To Solo-Caregiver Beta (Superseded Product Identity)

Superseded by the 2026-05-19 decision for product identity. Retained here as
implementation history and as context for why the current runtime remains
solo-safe.

### Decision

At the time, CareSupport's active product wedge was narrowed to a
**single-thread concierge beta** so the team could simplify implementation and
learn faster.

That is no longer the company-level product identity. The active runtime is
still a solo-thread wedge, but the product direction is multiplayer family care
coordination.

### What this means

The active experience for that phase was:
- one user
- one loved one / care situation
- one direct thread with CareSupport
- free during beta

### What is deferred

These were explicitly deferred for that phase:
- invites and team setup
- multiplayer coordination
- outreach to other family members or caregivers
- group chat behavior
- upgrade/paywall flows as part of the main product loop

### Why

The goal is to learn faster from a broader set of users. A 1:1 product has:
- lower onboarding friction
- more conversations per user
- cleaner product signal
- fewer trust and privacy edge cases

### Success metric

Primary metric:
- weekly retained users

Secondary metrics:
- first-value completion
- messages per retained user
- users with at least one saved care artifact
- blocked multiplayer requests

### Operational consequence

The runtime should remain solo-safe until permissioned outreach, tool actions,
and multiplayer tests exist.

### Revisit trigger

Superseded. Multiplayer coordination is now the explicit direction, but it
should still be built incrementally from a reliable first-thread loop.

## 2026-04-13 — Replace The Active Data Model With A Solo Care Core

Still true as current implementation status. Superseded only as a statement of
long-term product identity.

### Decision

CareSupport's active deterministic foundation is a solo-thread care model, not
the old v1 family-network model.

The core runtime and schema should be organized around:
- `users`
- `careCases`
- `messages`
- `medications`
- `scheduleItems`
- `memoryEntries`
- `auditLogs`

### What this means

The active system now treats:
- one texting person as the `user`
- one loved one / care situation as the `careCase`
- one 1:1 thread with CareSupport as the conversation surface
- durable memory as explicit structured entries, not a family-file markdown blob

### What is retired from the active architecture

These concepts are no longer first-class in the active product model:
- `families`
- `members`
- `approvals`
- `careTeam`
- `outreachThreads`
- access tiers / coordinator semantics
- plan-tier and member-limit enforcement

### Why

The solo beta needs the smallest truthful system that can:
- remember important user and care facts
- persist care records reliably
- answer from deterministic context
- avoid carrying deferred multiplayer complexity in the database and runtime contract

Keeping the old family schema as the active substrate would keep shaping product and engineering decisions around a product we are not currently shipping.

### Operational consequence

Future work should extend the current core directly, not reintroduce legacy
family abstractions through compatibility layers unless there is an explicit new
schema decision to do so.

### Revisit trigger

Superseded. The product decision has changed: multiplayer is the direction.
The implementation should still avoid reviving old entities accidentally.
