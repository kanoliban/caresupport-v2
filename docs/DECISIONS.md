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
