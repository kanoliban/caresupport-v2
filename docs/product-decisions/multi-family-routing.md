# Multi-Family Routing

**Status:** Deferred
**Date:** 2026-03-12
**Triggered by:** Koemen onboarding test — first external user

## Problem

Linq provides one 1:1 chat per phone pair. CareSupport identifies members by phone number. If a person belongs to multiple families, inbound messages have no signal for which family they're addressing.

## Koemen's Scenario

Koemen (+16513293421) is:
1. A member of the Kano family (added by Liban as a care team member)
2. A coordinator of his own family (caring for his own parent)

When Koemen texts CareSupport, the handler resolves his phone to a single member record. If he has two member records (one per family), `getMemberByPhone` returns whichever was created first. There's no way for him to say "I'm talking about my family now."

## Options Considered

### A. Chat-based routing
Each family gets its own Linq chat. Koemen would have two separate iMessage threads with CareSupport — one per family. Requires Linq to support multiple chats per phone pair (not currently possible with 1:1 chats).

### B. Context switching
Single chat, explicit commands: "Switch to Kano family" / "Switch to my family." Fragile UX — users forget which context they're in. Every message needs disambiguation logic.

### C. Separate numbers
Each family gets a different CareSupport phone number. Clean routing but expensive and confusing ("which number do I text?").

### D. Default family with override
Each phone maps to one default family. Override via keyword or menu. Simpler than B but still requires users to know the mechanism.

## Current Decision

**One phone, one family.** Enforced at creation time.

- `createOnboardingFamily` rejects if the phone already exists in ANY family's member list
- This means Koemen can only self-onboard if he's not already a member elsewhere
- If he IS already a member (e.g., in Kano family), a coordinator must add him to the new family manually, or we revisit this decision

This is intentionally restrictive. It prevents silent routing bugs at the cost of flexibility we don't need yet.

## Research Needed Before Revisiting

1. **Linq capabilities**: Can we create multiple 1:1 chats with the same phone? Group chat workarounds?
2. **Usage patterns**: How many users will actually be in multiple families? (Sample size needed)
3. **Disambiguation UX**: Test context-switching commands with real users before building
4. **Member resolution**: If we allow multi-family, `getMemberByPhone` must return all memberships, and the handler must pick one per message

## Constraint

`createOnboardingFamily` mutation enforces the one-phone-one-family rule. Any future multi-family support must relax this guard explicitly.
