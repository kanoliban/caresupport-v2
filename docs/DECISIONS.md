# Product Decisions

This file records durable product decisions for the active CareSupport product.

## 2026-04-13 — Pivot To Solo-Caregiver Beta

### Decision

CareSupport's active product wedge is now a **solo-caregiver concierge beta**, not a family-coordination product.

### What this means

The active experience is:
- one user
- one loved one / care situation
- one direct thread with CareSupport
- free during beta

### What is deferred

These are explicitly deferred, not active roadmap items for this phase:
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

The runtime should default to solo-safe behavior even before all data is reset. Existing or missing product-mode values must not silently reactivate family-coordination behavior.

### Revisit trigger

Multiplayer coordination should only be reconsidered after the solo loop shows clear weekly retention and repeated user demand.

## 2026-04-13 — Replace The Active Data Model With A Solo Care Core

### Decision

CareSupport's active deterministic foundation is now a solo-care model, not a family-network model.

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

Future work should extend the solo core directly, not reintroduce legacy family abstractions through compatibility layers unless there is an explicit new product decision to do so.

### Revisit trigger

Only revisit multiplayer-first entities if the product decision changes and the solo loop has already proven strong enough to justify expansion.
