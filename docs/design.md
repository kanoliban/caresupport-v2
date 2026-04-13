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
2. **The care plan is the source of truth.** Structured tables plus context fields should make the next message better.
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

## Data Model Direction

The backend still uses the existing family-oriented tables, but the active product semantics are:
- one account created in `solo_beta` mode
- one primary user/coordinator record
- one care recipient context
- no multiplayer behavior in the runtime path

The family-coordination architecture remains in code as dormant capability, not as the active product.

## What This Phase Must Prove

1. Users can onboard quickly with a solo care context.
2. Users return weekly because CareSupport helps them stay organized.
3. The core loop is strong enough without requiring multi-member setup.
4. Requests for multiplayer features are captured as product demand, not treated as the main wedge.
