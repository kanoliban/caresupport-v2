# CareSupport v2 — Architecture Overhaul

## Phase 1: Feedback Loop (Outreach → Response → Coordinator Notification)

- [x] 1a. Add `outreachThreads` table to `schema.ts`
- [x] 1b. Add mutations: `createOutreachThread`, `getPendingOutreachForSender`, `updateOutreachThread`
- [x] 1c. Add scheduled function: `expireStaleThreads`
- [x] 1d. Handler: after outreach send (Step 16), create outreach thread
- [x] 1e. Handler: after member resolution (Step 1), check pending outreach threads for this sender
- [x] 1f. Handler: after sending response (Step 15), if pending threads exist, notify coordinator and mark responded
- [x] 1g. Type-check + test

## Phase 2: Family-Wide Conversation Awareness

- [x] 2a. Add `getFamilyRecentMessages` mutation (query by_family_timestamp)
- [x] 2b. Update `formatConversationLog` to include member attribution
- [x] 2c. Handler Step 5: replace per-sender getRecentMessages with family-wide query
- [x] 2d. Add one-line prompt tweak about family-wide context
- [x] 2e. Type-check + test

## Phase 3: Observability

- [x] 3a. Create `convex/admin.ts` with listFamilies, getFamilyDetail, getOutreachThreads, getSystemHealth
- [x] 3b. Add structured `[CS]` prefix logging + timing to handler.ts
- [x] 3c. Type-check

## Phase 4: Structured Data Migration (DEFERRED — needs observability first)

- [x] 4a. Add `careTeam` table to schema
- [x] 4b. Add structured output fields to agent response type
- [x] 4c. Handler Step 13: process structured updates → typed table mutations
- [x] 4d. promptBuilder: build context from typed tables
- [x] 4e. Migration script: parse markdown → typed tables
- [x] 4f. Type-check + test
