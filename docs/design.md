# CareSupport v2 — Solo Beta Design

## What CareSupport Is

CareSupport is an iMessage-based care planning and reminders assistant for one person managing a loved one's care.

The active product is 1:1:
- one user
- one care context
- one persistent thread with CareSupport

There is no app or dashboard. iMessage is the interface.

## Current Product Wedge

The product is optimized for a solo caregiver who needs help staying on top of:
- medications
- appointments
- tasks and rides
- reminders
- care notes and preferences

## Design Principles

1. **Lower friction beats broader scope.** One useful 1:1 thread is better than a half-working team product.
2. **The care plan is the source of truth.** Structured care records plus durable memory should make the next message better.
3. **Act for the user directly.** The product should reduce mental load, not create coordination overhead.
4. **Single-user first.** Team coordination, invites, outreach, and permissions are deferred product paths.
5. **Memory matters.** CareSupport should remember preferences, routines, and care details over time.
6. **Free beta, retention-focused.** The current phase optimizes learning and weekly retention, not billing.

## Product Boundaries

In the active solo beta, CareSupport does not:
- add family members or caregivers
- text other people on the user's behalf
- operate group chats
- pitch upgrades or paid plans

If users ask for those things, the system should explain the current single-user boundary and keep helping them directly in-thread.

## Deterministic Foundation

The active application layer is now intentionally small and solo-native:
- `users` for the texting account owner
- `careCases` for the loved one / care situation being managed
- `messages` for the 1:1 thread with CareSupport
- `medications` and `scheduleItems` for structured care records
- `memoryEntries` for durable user and care-case memory
- `auditLogs` for traceability

This is the substrate the runtime should trust. CareSupport should not depend on a mutable family-file markdown blob or dormant multiplayer entities to do its core work.

## Harness Direction

The runtime harness should stay thin:
1. load the user, care case, recent messages, care records, and relevant memory
2. route the incoming message
3. call the model with the right care procedure
4. validate the response
5. persist typed updates
6. send and log the reply

Judgment lives in the prompt/procedure layer. Reliability lives in deterministic tools and storage.

## Deferred Architecture

The active product does not use:
- family/network entities
- coordinator/access-tier semantics
- approval pipelines
- outreach threads
- upgrade/member-limit enforcement

Those are deferred expansion concepts, not part of the current deterministic core.

## What This Phase Must Prove

1. Users can onboard quickly with a solo care context.
2. Users return weekly because CareSupport helps them stay organized.
3. The core loop is strong enough without requiring multi-member setup.
4. Requests for multiplayer features are captured as product demand, not treated as the main wedge.
