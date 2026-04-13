# Product Roadmap

Last updated: 2026-04-13

## Current State

CareSupport is pivoting from family coordination to a solo-caregiver concierge beta.

The active product path is:
- one user
- one loved one's care context
- free beta
- weekly retention as the north star

## Phase 0 — Solo Beta Reset

Reset the product and infrastructure around the single-user wedge.

### Required outcomes
- Runtime defaults new accounts to `solo_beta`
- Onboarding is for one user managing one loved one's care
- Multiplayer actions are blocked in the active product path
- Billing and family-plan upsell are removed from the primary experience
- Convex data reset procedure exists for dev and prod

## Phase 0.5 — Schema Alignment

Replace the old family-network substrate with a solo-native deterministic core while prod is still empty.

### Required outcomes
- Active schema is centered on `users`, `careCases`, `messages`, `medications`, `scheduleItems`, `memoryEntries`, and `auditLogs`
- Legacy multiplayer entities are removed from the active runtime contract
- Prompt context is assembled from structured records plus explicit memory entries
- Tests enforce that CareSupport does not claim a save/action unless it persisted deterministically
- Future agents can infer the real product model from code and docs without reading chat history

## Phase 1 — Core Solo Loop

Prove that solo caregivers return because the product is genuinely useful.

### Must be great at
- capturing medications
- tracking appointments
- tracking tasks and rides
- reminder-friendly scheduling
- remembering personal care context and communication preferences

### Success metrics
- weekly retained users
- activation to first saved care item
- messages per retained user
- percentage of users with at least one medication, appointment, or task saved

## Phase 2 — Concierge Beta Expansion

Run a 20–50 user concierge beta and learn fast.

### Operator goals
- onboard users manually or semi-manually
- observe where people return vs. churn
- capture repeated requests for multiplayer features
- refine onboarding and reminder behavior weekly

## Phase 3 — Decide on Expansion

Once the solo loop is strong, decide whether to:
- keep deepening solo caregiving
- reintroduce multiplayer coordination as an expansion path
- layer billing back in after retention is proven
