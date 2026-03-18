# CareSupport Upgrade & Billing Guardrails

## Plan
- [x] 1. Set STRIPE_SECRET_KEY in Convex prod
- [x] 2. Widen upgrade intent regex in handler.ts — catches any message containing upgrade/subscribe/sign me up (excludes negations)
- [x] 3. Rewrite Upgrade Skills in promptContent.ts — removed "reply upgrade" crutch, added enforcement policy, billing Q&A
- [x] 4. Non-coordinators get "ask [coordinator name] to upgrade" with actual names
- [x] 5. Type-check (clean) + tests (232 pass) + deployed

## Notes
- Soft enforcement for now: everything keeps working, agent nudges coordinator
- Only coordinators can upgrade (they're the payer)
- Pre-launch — no existing billing customers to break
