# ADR-002: Schema Redesign & Training Pipeline Architecture

**Status:** Proposed
**Date:** 2026-03-05
**Authors:** Liban Kano
**Reviewers:** Codex

---

## Review Guide

This RFC proposes three connected changes:

1. **Domain model redesign** (Section 2) — restructure the schema to model care networks, not just families
2. **Runtime evolution** (Section 3) — migrate the handler pipeline to use structured data instead of markdown blobs
3. **Training pipeline** (Section 4) — extract signal from conversations to build an RL feedback loop

**Where to focus review time:**

| Section | Priority | Why |
|---------|----------|-----|
| Section 2 (Domain Model) | **HIGH** | Gets the data model wrong → everything else breaks |
| Section 4 (Training Pipeline) | **HIGH** | Novel architecture, needs second-engineer validation |
| Section 3 (Runtime Evolution) | MEDIUM | Incremental migration, lower risk |
| Section 6 (Migration Strategy) | MEDIUM | Sequencing matters — wrong order = broken prod |
| Section 1 (Current State) | LOW | Reference material — skim for accuracy |
| Section 5 (Data Flow) | LOW | Visual aid for Sections 2-4 |

Items tagged `[REVIEW]` are explicit open questions where reviewer input is needed before implementation.

---

## Section 1: Current State Audit

### 1.1 Schema (11 tables)

Source: `convex/schema.ts`

| Table | Fields | Indexes | Purpose |
|-------|--------|---------|---------|
| `families` | familyId, familyName, careRecipient, status, timezone, notes, createdAt, updatedAt | by_family_id, by_status | Family metadata |
| `members` | familyId, phone, name, role, accessLevel, active, chatId, relationship | by_family, by_phone, by_chat_id, by_family_member | Care team roster |
| `medications` | familyId, name, dose, schedule, prescriber, pharmacy, lastConfirmed, refillDue, status | by_family, by_family_active | Medication tracking |
| `scheduleItems` | familyId, type, title, day, time, assignedTo, provider, location, transport, notes, status | by_family, by_family_type | Schedule entries (rides, tasks, appointments) |
| `conversations` | familyId, phone, direction, memberName, body, timestamp, sourceMessageId, deliveryStatus, deliveredAt, readAt, failureReason | by_family, by_phone, by_timestamp, by_source_message_id | Raw message log |
| `timelineEvents` | familyId, timestamp, direction, memberName, body | by_family, by_family_timestamp | Timeline view (subset of conversations) |
| `lessons` | familyId, scope, category, text, learnedAt | by_scope, by_family | Self-corrections learned from interactions |
| `approvals` | familyId, status, requesterPhone, requesterName, approverPhones, description, update, createdAt, expiresAt, resolvedAt, resolvedBy | by_family_status | Gated changes awaiting approval |
| `auditLogs` | familyId, event, phone, accessLevel, role, details, timestamp | by_family, by_family_timestamp | PHI access and enforcement audit trail |
| `familyContext` | familyId, contextMarkdown, updatedAt | by_family | Materialized markdown blob for prompt injection |
| *(validators)* | memberRole (4 values), accessLevel (5 tiers), medicationStatus (4), scheduleItemType (3), deliveryStatus (4), auditEventType (7), lessonScope/Category, approvalStatus (4) | — | Shared type unions |

### 1.2 What Works Well

**Enforcement pipeline** (`convex/lib/enforcement/roleFilter.ts:20-49`): 5-tier access matrix with section-level filtering. Pre-filters context before the LLM sees it, post-checks outbound for leakage. Mechanical safety — doesn't depend on the model behaving.

**CareRouter** (`convex/lib/pipeline/careRouter.ts:50-73`): Pattern-based intent classification → model routing. Zero API overhead. Emergency/escalation → Opus, medication changes → Sonnet, general → Haiku. Includes fallback chain.

**Intent-driven context filtering** (`convex/lib/pipeline/promptBuilder.ts:46-53`): `INTENT_FAMILY_MODE` maps intents to context scopes. Medication questions don't load ride schedules. Reduces token waste and leakage surface.

**AgentResponse contract** (`convex/lib/pipeline/types.ts:90-98`): Structured JSON output with 7 typed fields. Every response produces actionable data (outreach entries, file updates, corrections, routing updates), not just text.

**Delivery tracking** (`convex/schema.ts:74-79`): Message status lifecycle (sent → delivered → read → failed) with timestamps. Foundation for read-receipt signals.

### 1.3 Problems

**Problem 1: familyContext is a markdown blob** (`convex/schema.ts:237-241`, `convex/familyContext.ts:14-137`)
The `familyContext` table stores a single `contextMarkdown` string materialized from structured tables. The `materialize()` function at `familyContext.ts:14` joins all family data into markdown tables. This means:
- Structured data → markdown → regex parsing → LLM context. Lossy round-trip.
- `filterFamilyContext()` at `roleFilter.ts:136-160` regex-parses the markdown to filter by access level — fragile, depends on heading format.
- Updates via `applySectionUpdate()` at `familyContext.ts:143-186` use regex to find/replace sections — brittle string surgery.
- Training pipeline can't extract structured signals from prose.

**Problem 2: Members are family-scoped, not people** (`convex/schema.ts:128-141`)
A member belongs to exactly one `familyId`. Sarah the caregiver serving 3 families = 3 separate member records with 3 different `_id`s. No way to:
- Track Sarah's total workload across families
- Build a professional profile (CareGiver OS)
- Detect scheduling conflicts across networks
- `memberRole` has 4 values (`schema.ts:10-15`) but the product strategy defines 5 roles (care_recipient, family_caregiver, professional_caregiver, community_supporter, coordination_lead)

**Problem 3: No conversation threading** (`convex/schema.ts:173-189`)
Messages are flat rows with `familyId` + `phone` + `timestamp`. No concept of:
- Conversation sessions (a coherent exchange about one topic)
- Outcome signals (was the issue resolved? how many turns?)
- Topic classification beyond CareRouter's initial intent
- `timelineEvents` (`schema.ts:191-199`) duplicates conversations with fewer fields — redundant table

**Problem 4: Schedule model is stringly typed** (`convex/schema.ts:157-171`)
`day` and `time` are optional strings. No temporal types, no recurrence, no duration. Can't compute:
- Coverage windows (who's on duty when?)
- Gap detection (which hours are uncovered?)
- Overlap conflicts (two people assigned same slot)
- NHS metrics (coverage %, gap minutes)

**Problem 5: No network concept** (`convex/schema.ts:114-126`)
`families` is the only grouping entity. The product strategy defines 4 network types (family, independent caregiver, agency, platform). No way to:
- Model an agency network with multiple families
- Link a caregiver's practice across families (CareGiver OS)
- Compute Network Health Score across a network
- Apply different Policy Packs per network type

**Problem 6: No coordination events** (missing entirely)
The product strategy's Coverage Loop (Detect → Propose → Act → Verify → Learn) has no schema support. Gaps, handoffs, conflicts, and coverage proposals don't exist as data. The handler at `handler.ts:92-418` processes messages but doesn't record coordination decisions.

**Problem 7: No decision traces** (missing entirely)
Section 14 of the product strategy describes the Care Context Graph — structured records of "why this assignment was made." Nothing in the schema captures:
- Candidates evaluated for a gap
- Scoring/ranking rationale
- Policy version applied
- Outcome verification

**Problem 8: Lessons lack context** (`convex/schema.ts:201-209`)
`lessons` has `text`, `category`, and `familyId`, but no link to:
- Which conversation triggered the lesson
- Which message was corrected
- Whether the lesson was effective (did the same mistake recur?)
- Graduation status (lessons are append-only, never pruned)

**Problem 9: Approvals are not linked to outcomes** (`convex/schema.ts:211-223`)
`approvals` track whether a change was approved/rejected, but not:
- What happened after approval (was the change actually applied?)
- Whether the approved change was correct (post-hoc validation)
- Time from request to resolution

**Problem 10: No 1-to-N messaging model** (`convex/handler.ts:92-99`)
`handleMessage` processes one inbound message and sends one outbound response. The product strategy requires:
- Broadcasting to multiple members (gap alerts, handoff summaries)
- Conversation branching (ask 3 candidates to fill a gap, handle responses from each)
- Scheduled messages (medication reminders, shift confirmations)

### 1.4 Current Data Flow

```
                    ┌─────────────┐
                    │  Linq SMS   │
                    │  Webhook    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  http.ts    │
                    │  (verify +  │
                    │   parse)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ handler.ts  │
                    │ handleMsg() │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │  Resolve    │ │  Load    │ │  CareRouter │
     │  member by  │ │  context │ │  route()    │
     │  phone      │ │  (3 par) │ │             │
     └──────┬──────┘ └────┬─────┘ └──────┬──────┘
            │              │              │
            │      ┌───────▼───────┐      │
            │      │ familyContext │      │
            │      │ .markdown    │      │
            │      │ (blob)       │      │
            │      └───────┬───────┘      │
            │              │              │
            │      ┌───────▼───────┐      │
            │      │ roleFilter   │      │
            │      │ (pre-filter) │      │
            │      └───────┬───────┘      │
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼──────┐
                    │ promptBuild │
                    │ (6 blocks) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Anthropic   │
                    │ API call    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ extractJson │
                    │ (parse)     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │ Leakage     │ │ Apply    │ │ Persist     │
     │ post-check  │ │ updates  │ │ lessons     │
     └──────┬──────┘ └────┬─────┘ └──────┬──────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼──────┐
                    │ Send via    │
                    │ Linq API    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Outreach    │
                    │ (best-      │
                    │  effort)    │
                    └─────────────┘
```

---

## Section 2: Domain Model Redesign

### 2.1 Person/Membership Split

**Problem:** A caregiver serving 3 families has 3 separate `members` records (`schema.ts:128-141`). No unified identity.

**Proposal:** Split into `persons` (identity) and `memberships` (network role).

```typescript
// Person — one record per human, across all networks
persons: defineTable({
  phone: v.string(),                    // E.164, primary key equivalent
  name: v.string(),
  email: v.optional(v.string()),
  timezone: v.optional(v.string()),
  profileData: v.optional(v.object({    // CareGiver OS professional profile
    bio: v.optional(v.string()),
    certifications: v.optional(v.array(v.string())),
    specialties: v.optional(v.array(v.string())),
    maxFamilies: v.optional(v.number()),
  })),
  createdAt: v.number(),
})
  .index("by_phone", ["phone"])
  .index("by_email", ["email"]),

// Membership — a person's role within a specific network
memberships: defineTable({
  personId: v.id("persons"),
  networkId: v.id("networks"),
  role: v.union(
    v.literal("care_recipient"),
    v.literal("family_caregiver"),
    v.literal("professional_caregiver"),
    v.literal("community_supporter"),
    v.literal("coordination_lead"),
  ),
  accessLevel: v.union(
    v.literal("full"),
    v.literal("schedule+meds"),
    v.literal("schedule"),
    v.literal("provider"),
    v.literal("limited"),
  ),
  active: v.boolean(),
  chatId: v.optional(v.string()),       // Linq chat ID (per network)
  relationship: v.optional(v.string()), // to care recipient
  joinedAt: v.number(),
})
  .index("by_person", ["personId"])
  .index("by_network", ["networkId"])
  .index("by_person_network", ["personId", "networkId"])
  .index("by_chat_id", ["chatId"]),
```

`[REVIEW-1]` Should `chatId` live on `memberships` (per-network conversations) or `persons` (one chat per human, route by context)? Current system has one chatId per member — but multi-network members would need routing logic.

### 2.2 Network as First-Class Entity

**Problem:** `families` is the only grouping. Product strategy defines 4 network types.

```typescript
networks: defineTable({
  name: v.string(),
  type: v.union(
    v.literal("family"),
    v.literal("independent_caregiver"),
    v.literal("agency"),
    v.literal("platform"),
  ),
  status: v.union(
    v.literal("active"),
    v.literal("paused"),
    v.literal("archived"),
  ),
  careRecipientId: v.optional(v.id("persons")), // family networks
  policyPack: v.string(),              // "Family.Basic", "Pro.Multi-Family", etc.
  timezone: v.string(),
  config: v.optional(v.object({
    coverageWindow: v.optional(v.object({
      start: v.string(),               // "07:00"
      end: v.string(),                 // "22:00"
    })),
    escalationThresholdMinutes: v.optional(v.number()),
    requireHandoffs: v.optional(v.boolean()),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_type", ["type"])
  .index("by_status", ["status"]),
```

`[REVIEW-2]` Should `policyPack` be a string reference or an inline object? String keeps the schema lean and allows Policy Packs to evolve independently. Inline makes queries simpler. The product strategy lists 5 templates — these will grow.

### 2.3 Conversation Threading

**Problem:** Messages are flat rows (`schema.ts:173-189`). No sessions, no outcomes.

```typescript
// Session — a coherent exchange about one topic
conversationSessions: defineTable({
  networkId: v.id("networks"),
  personId: v.id("persons"),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),       // null = still active
  intent: v.optional(v.string()),        // CareRouter classification
  topic: v.optional(v.string()),         // human-readable summary
  outcome: v.optional(v.union(
    v.literal("resolved"),
    v.literal("escalated"),
    v.literal("abandoned"),
    v.literal("pending"),
  )),
  turnCount: v.number(),
  modelTier: v.optional(v.string()),     // highest tier used
})
  .index("by_network", ["networkId"])
  .index("by_person", ["personId"])
  .index("by_network_person", ["networkId", "personId"]),

// Message — individual turns within a session
messages: defineTable({
  sessionId: v.id("conversationSessions"),
  networkId: v.id("networks"),           // denormalized for queries
  personId: v.id("persons"),             // denormalized
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  body: v.string(),
  timestamp: v.number(),
  sourceMessageId: v.optional(v.string()),
  deliveryStatus: v.optional(v.union(
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("read"),
    v.literal("failed"),
  )),
  deliveredAt: v.optional(v.number()),
  readAt: v.optional(v.number()),
  failureReason: v.optional(v.string()),
  // AI response metadata (outbound only)
  routedTier: v.optional(v.string()),
  routedIntent: v.optional(v.string()),
  tokensUsed: v.optional(v.number()),
  latencyMs: v.optional(v.number()),
})
  .index("by_session", ["sessionId"])
  .index("by_network", ["networkId"])
  .index("by_person", ["personId"])
  .index("by_timestamp", ["timestamp"])
  .index("by_source_message_id", ["sourceMessageId"]),
```

Session boundaries: new session starts when >30 min gap between messages from same person, or when CareRouter classifies a different intent. Tunable.

`[REVIEW-3]` Should `outcome` be set by the model (in AgentResponse) or by a post-hoc scoring pipeline? Model self-assessment is fast but unreliable. Post-hoc is accurate but delayed.

### 2.4 Structured Schedules

**Problem:** `scheduleItems` uses string `day`/`time` (`schema.ts:157-171`). Can't compute coverage.

```typescript
scheduleEntries: defineTable({
  networkId: v.id("networks"),
  type: v.union(
    v.literal("shift"),
    v.literal("ride"),
    v.literal("care_task"),
    v.literal("appointment"),
    v.literal("medication_window"),
  ),
  title: v.string(),
  // Temporal fields — real types, not strings
  startsAt: v.number(),                 // epoch ms
  endsAt: v.number(),                   // epoch ms
  recurrence: v.optional(v.object({
    pattern: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
    ),
    daysOfWeek: v.optional(v.array(v.number())), // 0=Sun, 6=Sat
    endsAt: v.optional(v.number()),      // recurrence end date
  })),
  assignedTo: v.optional(v.id("persons")),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.union(
    v.literal("scheduled"),
    v.literal("confirmed"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("cancelled"),
    v.literal("missed"),
  ),
  completedAt: v.optional(v.number()),
  completedBy: v.optional(v.id("persons")),
})
  .index("by_network", ["networkId"])
  .index("by_network_type", ["networkId", "type"])
  .index("by_assigned", ["assignedTo"])
  .index("by_time_range", ["networkId", "startsAt"]),
```

`[REVIEW-4]` Epoch ms for all temporal fields, or ISO 8601 strings? Epoch is easier for range queries in Convex. ISO is human-readable in the dashboard. Convex doesn't have a native date type.

### 2.5 Coordination Events

**Problem:** The Coverage Loop has no data model.

```typescript
coordinationEvents: defineTable({
  networkId: v.id("networks"),
  type: v.union(
    v.literal("gap_detected"),
    v.literal("gap_filled"),
    v.literal("gap_escalated"),
    v.literal("handoff_started"),
    v.literal("handoff_completed"),
    v.literal("conflict_detected"),
    v.literal("conflict_resolved"),
    v.literal("coverage_proposal"),
    v.literal("shift_swap"),
    v.literal("availability_change"),
  ),
  // What triggered this event
  trigger: v.object({
    source: v.union(
      v.literal("system"),          // automated detection
      v.literal("message"),         // member-initiated
      v.literal("schedule_change"), // schedule mutation
    ),
    messageId: v.optional(v.id("messages")),
    scheduleEntryId: v.optional(v.id("scheduleEntries")),
  }),
  // Event-specific payload
  details: v.object({
    gapWindow: v.optional(v.object({
      startsAt: v.number(),
      endsAt: v.number(),
    })),
    involvedPersons: v.optional(v.array(v.id("persons"))),
    resolution: v.optional(v.string()),
    resolvedBy: v.optional(v.id("persons")),
  }),
  status: v.union(
    v.literal("open"),
    v.literal("in_progress"),
    v.literal("resolved"),
    v.literal("expired"),
  ),
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_network", ["networkId"])
  .index("by_network_type", ["networkId", "type"])
  .index("by_network_status", ["networkId", "status"]),
```

### 2.6 Decision Traces

**Problem:** The Care Context Graph has no schema.

```typescript
decisionTraces: defineTable({
  networkId: v.id("networks"),
  coordinationEventId: v.id("coordinationEvents"),
  // What triggered the decision
  trigger: v.string(),                   // "gap_detected", "shift_swap_request"
  // Context gathered
  context: v.object({
    gapWindow: v.optional(v.object({
      startsAt: v.number(),
      endsAt: v.number(),
    })),
    requiredCapabilities: v.optional(v.array(v.string())),
    urgency: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    )),
  }),
  // Candidates evaluated
  candidatesEvaluated: v.array(v.object({
    personId: v.id("persons"),
    available: v.boolean(),
    score: v.optional(v.number()),       // composite score
    reasoning: v.optional(v.string()),   // why scored this way
    disqualifiedReason: v.optional(v.string()),
  })),
  // Decision
  policyApplied: v.string(),             // Policy Pack version
  proposedAction: v.string(),            // "assign_sarah", "split_shift"
  reasoning: v.string(),                 // human-readable explanation
  // Outcome
  outcome: v.optional(v.union(
    v.literal("accepted"),
    v.literal("rejected"),
    v.literal("modified"),
    v.literal("expired"),
  )),
  outcomeTimestamp: v.optional(v.number()),
  // Verification
  verified: v.optional(v.boolean()),
  verificationNotes: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_network", ["networkId"])
  .index("by_event", ["coordinationEventId"]),
```

`[REVIEW-5]` Decision traces will grow fast. Should we:
(a) Store full traces in Convex and accept storage costs
(b) Store summaries in Convex, full traces in cold storage (S3/R2)
(c) TTL — keep full traces for 90 days, archive to summary after

### 2.7 Entity Relationship Diagram

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│ persons  │────<│ memberships │>────│ networks │
│          │     │             │     │          │
│ phone    │     │ role        │     │ type     │
│ name     │     │ accessLevel │     │ policy   │
│ profile  │     │ chatId      │     │ config   │
└────┬─────┘     └─────────────┘     └────┬─────┘
     │                                     │
     │  ┌──────────────────┐               │
     │  │ conversationSess │               │
     │  │                  │>──────────────┘
     ├─<│ intent, outcome  │
     │  │ turnCount        │
     │  └────────┬─────────┘
     │           │
     │  ┌────────▼─────────┐
     │  │ messages         │
     │  │                  │
     │  │ body, direction  │
     │  │ delivery status  │
     │  │ AI metadata      │
     │  └──────────────────┘
     │
     │  ┌──────────────────┐               │
     │  │ scheduleEntries  │               │
     └─<│                  │>──────────────┘
        │ startsAt, endsAt │
        │ recurrence       │
        │ status           │
        └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│ coordinationEvts │>────│ decisionTraces   │
│                  │     │                  │
│ type, trigger    │     │ candidates[]     │
│ details          │     │ reasoning        │
│ status           │     │ policyApplied    │
└──────────────────┘     │ outcome          │
                         └──────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ medications  │  │ lessons      │  │ approvals    │
│ (unchanged)  │  │ + sessionId  │  │ + outcomeId  │
│ + networkId  │  │ + messageId  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.8 Open Questions (Section 2)

1. `[REVIEW-1]` chatId placement: memberships vs. persons
2. `[REVIEW-2]` policyPack: string reference vs. inline object
3. `[REVIEW-3]` Session outcome: model-assessed vs. post-hoc pipeline
4. `[REVIEW-4]` Temporal representation: epoch ms vs. ISO 8601 strings
5. `[REVIEW-5]` Decision trace storage strategy: full in Convex vs. tiered

---

## Section 3: Runtime Evolution

### 3.1 Handler Migration Map

Current handler: `convex/handler.ts:92-418` (16 steps).

| Step | Current | Proposed | Breaking? |
|------|---------|----------|-----------|
| 1. Resolve member | `getMemberByPhone` → `members` table (`handler.ts:105-107`) | `getPersonByPhone` → `persons` + `memberships` join | Yes — member ID → person ID + membership ID |
| 2. Update chatId | `updateMemberChatId` on `members` (`handler.ts:125-130`) | `updateMembershipChatId` on `memberships` | No — same pattern, different table |
| 2b. Read receipt + typing | Linq `markAsRead` + `startTyping` (`handler.ts:133-142`) | Unchanged | No |
| 3. Log inbound | `logConversation` + `logTimeline` (`handler.ts:145-160`) | `createMessage` on `messages` (single write, session-aware) | Yes — removes `timelineEvents` duplication |
| 4. Approval check | `detectApprovalResponse` + `getPendingApprovals` (`handler.ts:163-181`) | Unchanged logic, but approval now links to coordination event | No |
| 5. Load context | 3 parallel queries: `getFamilyContext`, `getRecentConversations`, `getFamilyLessons` (`handler.ts:185-192`) | `assembleContext(networkId, personId, intent)` — builds from structured data | Yes — replaces markdown blob |
| 6. Pre-filter | `filterFamilyContext` regex parsing (`handler.ts:208`) | `filterByAccessLevel(structuredContext, accessLevel)` — operates on objects, not strings | Yes — different function signature |
| 7. Audit log | `buildContextLoadEvent` (`handler.ts:212-220`) | Unchanged — same audit contract | No |
| 8. Route intent | `route(messageBody)` (`handler.ts:223`) | Unchanged — CareRouter works on raw text | No |
| 9. Build prompt | `buildSystemBlocks()` with 6 blocks (`handler.ts:226-244`) | `buildSystemBlocks()` with structured context → formatted sections | Yes — input changes from markdown to structured data |
| 10. Call AI | `callAnthropic()` (`handler.ts:255-262`) | Unchanged — same API client | No |
| 11. Post-check | `checkOutboundMessage` leakage scan (`handler.ts:278-297`) | Unchanged — operates on outbound text | No |
| 12. Audit response | `buildResponseSentEvent` (`handler.ts:300-308`) | Unchanged | No |
| 13. Apply updates | `classifyUpdates` + `applyContextUpdates` (`handler.ts:311-346`) | Write to structured tables directly (no markdown surgery) | Yes — removes `familyContext` blob mutation |
| 14. Persist lessons | `persistLesson` (`handler.ts:349-360`) | `persistLesson` with `sessionId` and `messageId` links | Minor — adds optional fields |
| 15. Pace + send | `sendResponse` via Linq (`handler.ts:363-368`) | Unchanged | No |
| 16. Outreach | Best-effort `sendMessage`/`createChat` (`handler.ts:371-407`) | Unchanged logic, but log to coordination events | Minor |

**Summary:** 6 breaking changes, 4 non-breaking, 6 unchanged. Breaking changes are concentrated in context assembly (steps 1, 3, 5, 6, 9, 13).

### 3.2 Context Assembly from Structured Data

Replace `familyContext.materialize()` (`familyContext.ts:14-137`) with a structured context assembler:

```typescript
interface StructuredContext {
  network: {
    name: string;
    type: string;
    careRecipient: string;
    policyPack: string;
  };
  team: Array<{
    name: string;
    role: string;
    phone: string;
    accessLevel: string;
    active: boolean;
    relationship?: string;
  }>;
  medications: Array<{
    name: string;
    dose: string;
    schedule: string;
    prescriber?: string;
    status: string;
  }>;
  schedule: Array<{
    type: string;
    title: string;
    startsAt: number;
    endsAt: number;
    assignedTo?: string;
    status: string;
  }>;
  recentEvents: Array<{
    type: string;
    summary: string;
    timestamp: number;
  }>;
}
```

The structured context gets formatted into text blocks at prompt construction time (`buildSystemBlocks`), not materialized into a stored blob. This means:
- Filtering is object-property access, not regex parsing
- Updates write to individual tables, not markdown string surgery
- Training pipeline can access raw structured data, not parse markdown

`[REVIEW-6]` Should we keep `familyContext` table as a cache during migration (structured → format → cache → serve), or go direct (structured → format at request time)? Cache adds complexity but reduces latency for hot paths.

### 3.3 1-to-N Messaging Model

Current: `handleMessage` receives one inbound, sends one outbound (`handler.ts:92-99`).

**Phase 1 (immediate):** Keep 1:1 pattern but log outreach to `messages` table with proper session linking.

**Phase 2 (post-schema migration):** Add `scheduledMessages` table for:
- Medication reminders
- Shift confirmations
- Gap alert broadcasts

**Phase 3 (post-training pipeline):** Add conversation branching:
- Gap detected → message N candidates → collect responses → assign best

`[REVIEW-7]` For Phase 2, should scheduled messages use Convex scheduled functions or an external scheduler? Convex scheduled functions have a 5-minute minimum granularity. Medication reminders might need minute-level precision.

### 3.4 What Does NOT Change

- **SOUL.md content** (`promptContent.ts:1-74`): Voice, personality, response guidelines — all stable
- **Enforcement pipeline** (`roleFilter.ts`): 5-tier access matrix, leakage scanning, approval gating — all stable
- **CareRouter** (`careRouter.ts`): Intent classification, model routing, fallback chain — all stable
- **Model fallback** (`careRouter.ts:75-89`): Haiku → Sonnet → Opus escalation — stable
- **AgentResponse contract** (`types.ts:90-98`): 7-field structured output — stable (but extended)

`[REVIEW-8]` Should `AgentResponse` be extended with new fields (e.g., `coordinationActions`, `sessionOutcome`) or should those be separate post-processing steps?

---

## Section 4: Training Pipeline Architecture

### 4.1 Signal Extraction

Every conversation interaction produces potential training signals. These are extracted post-hoc, not inline with the handler.

| Signal | Source | Quality | Extraction |
|--------|--------|---------|------------|
| **Explicit correction** | User says "no, that's wrong" / "don't do that" | HIGH | Already captured in `selfCorrections` field of `AgentResponse` (`types.ts:95`) |
| **Follow-up clarification** | User repeats request with different wording | MEDIUM | Detect when consecutive messages share topic but second rephrases first |
| **Read receipt timing** | Time from delivered → read | LOW-MEDIUM | Already tracked (`schema.ts:182-183`). Fast read = engaging. No read = ignored. |
| **Session length** | Number of turns to resolution | MEDIUM | Shorter sessions (for simple intents) = better. Long sessions = confusion or complexity |
| **Approval rate** | % of AI-proposed changes approved vs. rejected | HIGH | Already tracked in `approvals` table (`schema.ts:211-223`) |
| **Outreach success** | Did outreach message get a response? | MEDIUM | Cross-reference outreach messages with subsequent inbound from target |
| **Re-engagement** | Does the member message again within 24h? | LOW | Proxy for satisfaction — returning users = system is useful |
| **Coordinator override** | Coordinator manually changes something AI proposed | HIGH | Detect when `familyFileUpdates` are followed by contradicting updates |

### 4.2 Training-Specific Tables

```typescript
// Scored interaction — one per outbound message
trainingInteractions: defineTable({
  messageId: v.id("messages"),
  sessionId: v.id("conversationSessions"),
  networkId: v.id("networks"),
  // Input snapshot (for reproducibility)
  inputSnapshot: v.object({
    inboundText: v.string(),
    intent: v.string(),
    modelTier: v.string(),
    contextSectionCount: v.number(),
    turnInSession: v.number(),
  }),
  // Output snapshot
  outputSnapshot: v.object({
    responseText: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    updatesProposed: v.number(),
    outreachTriggered: v.number(),
    correctionsLogged: v.number(),
  }),
  // Scores (populated by scoring pipeline)
  scores: v.optional(v.object({
    overall: v.number(),               // 0-1
    accuracy: v.number(),              // factual correctness
    helpfulness: v.number(),           // did it advance the user's goal
    voice: v.number(),                 // adherence to SOUL voice guidelines
    safety: v.number(),                // no leakage, no hallucination
    efficiency: v.number(),            // token economy, response length
  })),
  scoredAt: v.optional(v.number()),
  scoredBy: v.optional(v.string()),    // "opus-evaluator" or "human"
  createdAt: v.number(),
})
  .index("by_session", ["sessionId"])
  .index("by_network", ["networkId"])
  .index("by_scored", ["scoredAt"]),

// Extracted pattern — recurring behavior worth reinforcing or correcting
trainingPatterns: defineTable({
  type: v.union(
    v.literal("positive"),             // reinforce
    v.literal("negative"),             // correct
    v.literal("edge_case"),            // needs human review
  ),
  description: v.string(),
  frequency: v.number(),              // times observed
  exampleInteractionIds: v.array(v.id("trainingInteractions")),
  // Confidence that this pattern is real (not noise)
  confidence: v.number(),             // 0-1
  status: v.union(
    v.literal("detected"),
    v.literal("reviewed"),
    v.literal("applied"),
    v.literal("dismissed"),
  ),
  createdAt: v.number(),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.string()),
})
  .index("by_type", ["type"])
  .index("by_status", ["status"]),

// Training proposal — suggested change to prompt/behavior
trainingProposals: defineTable({
  patternId: v.id("trainingPatterns"),
  proposalType: v.union(
    v.literal("prompt_addition"),      // add to SOUL/SKILLS/ROUTING
    v.literal("prompt_modification"),  // modify existing prompt content
    v.literal("lesson_graduation"),    // promote family lesson to global
    v.literal("router_adjustment"),    // change CareRouter patterns
    v.literal("policy_update"),        // modify Policy Pack defaults
  ),
  description: v.string(),
  diff: v.string(),                   // what would change
  expectedImpact: v.string(),         // predicted improvement
  status: v.union(
    v.literal("proposed"),
    v.literal("approved"),
    v.literal("applied"),
    v.literal("rejected"),
    v.literal("rolled_back"),
  ),
  // Measurement (post-application)
  measurement: v.optional(v.object({
    baselineScore: v.number(),
    postScore: v.number(),
    sampleSize: v.number(),
    significant: v.boolean(),
  })),
  createdAt: v.number(),
  appliedAt: v.optional(v.number()),
})
  .index("by_pattern", ["patternId"])
  .index("by_status", ["status"]),
```

### 4.3 Scoring Pipeline

**Evaluator model:** Opus (highest reasoning capability) scores interactions nightly.

**Scoring prompt structure:**
1. System: "You are evaluating a care coordination agent's response quality."
2. Provide: original inbound message, context available to agent, agent's response, conversation history
3. Rate on 5 dimensions (0.0-1.0): accuracy, helpfulness, voice, safety, efficiency
4. Provide reasoning for each score

**Scoring dimensions:**

| Dimension | What it measures | 0.0 | 1.0 |
|-----------|------------------|-----|-----|
| Accuracy | Factual correctness | Hallucinated data, wrong names/times | All facts match family context |
| Helpfulness | Advances user's goal | Ignored request, asked unnecessary questions | Resolved in minimum turns |
| Voice | SOUL compliance | Used markdown, stacked questions, over-explained | Matched family register, concise, natural |
| Safety | No leakage or harm | PHI leak, medical advice, fabricated actions | Clean, within access scope, honest |
| Efficiency | Token/response economy | Verbose, loaded unnecessary context | Right-sized response, efficient routing |

**Batch schedule:** Nightly, score all unscored interactions from the past 24h. Estimated cost: ~$0.02/interaction at Opus input pricing (short context per evaluation).

`[REVIEW-9]` Should scoring run as a Convex cron job or an external pipeline (e.g., triggered by GitHub Action)? Convex crons are simpler but limited to 10-minute intervals. External pipeline gives more control but adds infra.

### 4.4 Pattern Extraction → Proposal → Review → Apply → Measure

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Score       │     │  Extract    │     │  Generate   │
│  interactions│────>│  patterns   │────>│  proposals  │
│  (nightly)   │     │  (weekly)   │     │  (weekly)   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Human      │
                                        │  review     │
                                        │  gate       │
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Apply to   │
                                        │  prompts    │
                                        └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Measure    │
                                        │  A/B score  │
                                        │  delta      │
                                        └─────────────┘
```

**Pattern extraction (weekly):**
- Cluster low-scoring interactions by intent and failure mode
- Identify recurring themes (e.g., "always loads full context for simple greetings" → router issue)
- Flag positive patterns worth reinforcing (e.g., "concise medication summaries score highest")

**Proposal generation:**
- For each significant pattern, generate a concrete prompt change
- Estimate impact: "This change would affect ~N% of interactions"
- Diff format: show exactly what text/config would change

**Review gate:**
- Human reviews proposals before application
- Accept, reject, or modify
- No automated application without review (at least initially)

**Measurement:**
- After applying a change, compare scores for affected interaction types
- Baseline: average score for that intent type in the 7 days before
- Post: average score for same intent type in the 7 days after
- Significant if delta > 0.05 with sample size > 20

`[REVIEW-10]` Should the scoring pipeline also score coordination events (gap detection accuracy, proposal quality) or just conversation interactions? Scoring coordination events is higher value but needs a different evaluation rubric.

### 4.5 Open Questions (Section 4)

1. `[REVIEW-9]` Scoring pipeline: Convex cron vs. external pipeline
2. `[REVIEW-10]` Scope: conversation-only vs. conversation + coordination events
3. `[REVIEW-11]` How long to keep `inputSnapshot`/`outputSnapshot` in `trainingInteractions`? These are large. Options: keep forever (expensive), TTL 90 days (lose history), archive to cold storage
4. `[REVIEW-12]` Should the evaluator model also generate suggested rewrites (what the agent SHOULD have said)? This is expensive but produces direct training signal for fine-tuning
5. `[REVIEW-13]` Privacy: training data contains real conversations. What anonymization is needed before any off-device processing?

---

## Section 5: Data Flow Diagrams

### 5.1 Current Handler Flow

(See Section 1.4 — same diagram)

### 5.2 Proposed Handler Flow

```
                    ┌─────────────┐
                    │  Linq SMS   │
                    │  Webhook    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  http.ts    │
                    │  (unchanged)│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ handler.ts  │
                    │ handleMsg() │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐   ┌─────▼──────┐   ┌──────▼──────┐
  │ Resolve     │   │ Find/create│   │ CareRouter  │
  │ person by   │   │ session    │   │ route()     │
  │ phone       │   │            │   │ (unchanged) │
  │ + membership│   │ (NEW)      │   │             │
  └──────┬──────┘   └─────┬──────┘   └──────┬──────┘
         │                 │                 │
         │         ┌───────▼───────┐         │
         │         │ assembleCtx() │         │
         │         │ (structured   │<────────┘
         │         │  queries, NOT │  intent drives
         │         │  markdown)    │  which tables
         │         └───────┬───────┘  to query
         │                 │
         │         ┌───────▼───────┐
         │         │ filterByAccess│
         │         │ (object props │
         │         │  not regex)   │
         │         └───────┬───────┘
         │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │ promptBuild │
                    │ (format     │
                    │  structured │
                    │  → text)    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Anthropic   │
                    │ API call    │
                    │ (unchanged) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ extractJson │
                    │ (unchanged) │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐   ┌─────▼──────┐   ┌──────▼──────┐
  │ Leakage     │   │ Write to   │   │ Persist     │
  │ post-check  │   │ structured │   │ lessons     │
  │ (unchanged) │   │ tables     │   │ + session   │
  │             │   │ (NOT md    │   │   link      │
  │             │   │  surgery)  │   │             │
  └──────┬──────┘   └─────┬──────┘   └──────┬──────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Log to      │
                    │ messages    │
                    │ + session   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐        ┌─────────────┐
                    │ Send via    │        │ Coordination │
                    │ Linq API    │───────>│ events       │
                    │ (unchanged) │        │ (NEW, async) │
                    └──────┬──────┘        └─────────────┘
                           │
                    ┌──────▼──────┐
                    │ Outreach    │
                    │ + log to    │
                    │ coord evts  │
                    └─────────────┘
```

**Key differences from current flow:**
- Person + membership resolution (not flat member lookup)
- Session creation/lookup (new step)
- Structured context assembly (replaces markdown blob)
- Object-based access filtering (replaces regex parsing)
- Structured table writes (replaces markdown surgery)
- Coordination event logging (new async step)

### 5.3 Training Data Lifecycle

```
  Live Interactions                Scoring Pipeline             Learning Loop
  ─────────────────               ────────────────             ────────────────

  ┌─────────────┐
  │ messages +   │
  │ sessions     │──── nightly ───> ┌─────────────┐
  │ (raw data)   │                  │ Create       │
  └─────────────┘                  │ training     │
                                   │ interactions │
                                   └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │ Opus scores  │
                                   │ 5 dimensions │
                                   └──────┬──────┘
                                          │
                                          │ weekly
                                          │
                                   ┌──────▼──────┐
                                   │ Pattern      │
                                   │ extraction   │──────> ┌─────────────┐
                                   └─────────────┘        │ Proposals   │
                                                          │ (prompt     │
                                                          │  changes)   │
                                                          └──────┬──────┘
                                                                 │
                                                          ┌──────▼──────┐
                                                          │ Human       │
                                                          │ review      │
                                                          └──────┬──────┘
                                                                 │
                                                          ┌──────▼──────┐
                                                          │ Apply +     │
                                                          │ measure     │
                                                          │ score delta │
                                                          └─────────────┘
```

---

## Section 6: Migration Strategy

### 6.1 Phase Overview

| Phase | Duration | What | Risk |
|-------|----------|------|------|
| 1. Schema foundation | ~2 weeks | Add `persons`, `networks`, `memberships` tables. Dual-write from existing tables. | LOW — additive only |
| 2. Conversation threading | ~1 week | Add `conversationSessions`, `messages`. Migrate handler steps 3 + log. | MEDIUM — changes message logging |
| 3. Structured context | ~2 weeks | Add `assembleContext()`. Replace `familyContext` blob reads. | HIGH — changes prompt construction |
| 4. Schedule + coordination | ~1 week | Add `scheduleEntries`, `coordinationEvents`. Migrate `scheduleItems`. | MEDIUM — data migration |
| 5. Training pipeline | ~2 weeks | Add training tables. Deploy scoring pipeline. | LOW — additive, doesn't touch handler |
| 6. Cleanup | ~1 week | Remove `familyContext`, `timelineEvents`, old `members` table. | LOW — only after all reads migrated |

**Total estimated:** ~9 weeks

### 6.2 Phase 1: Schema Foundation

**Add tables:** `persons`, `networks`, `memberships`

**Migration script:**
1. For each row in `families` → create a `networks` row (type: "family")
2. For each row in `members` → create a `persons` row (deduplicate by phone) + `memberships` row
3. Backfill `careRecipientId` on networks from `families.careRecipient` name → persons lookup

**Dual-write strategy:** `getMemberByPhone` continues to work against `members`. New `getPersonByPhone` reads from `persons` + `memberships`. Handler uses old path until Phase 3.

**Exit criteria:**
- All existing members have corresponding `persons` + `memberships` records
- Indexes verify referential integrity
- Existing handler unchanged — all tests pass

### 6.3 Phase 2: Conversation Threading

**Add tables:** `conversationSessions`, `messages`

**Migration:**
1. Handler step 3 writes to both `conversations` (old) and `messages` (new)
2. Session creation logic: if no active session for this person+network in last 30 min, create new
3. `timelineEvents` writes become redundant (messages table replaces both)

**Exit criteria:**
- All new messages appear in both old and new tables
- Session boundaries are reasonable (manual inspection of 20 conversations)
- `timelineEvents` reads migrated to `messages` queries

### 6.4 Phase 3: Structured Context

**Replace:** `familyContext.materialize()` and `filterFamilyContext()`

**This is the highest-risk phase.** The entire prompt quality depends on context assembly.

**Strategy:**
1. Build `assembleContext()` that queries `persons`, `memberships`, `medications`, `scheduleEntries`
2. Add `formatContext()` that renders structured data to text blocks
3. A/B: for each interaction, assemble context both ways (old + new), compare output
4. Log deltas to a `contextMigrationDiffs` table for review
5. Switch handler to new path only after diff review shows <5% meaningful divergence

**Exit criteria:**
- `assembleContext()` produces equivalent content to `familyContext.contextMarkdown`
- Access filtering works on structured objects (test all 5 access levels)
- Handler uses new context path for all interactions
- No regression in agent response quality (manual review of 20 interactions)

### 6.5 Phase 4: Schedule + Coordination Events

**Add tables:** `scheduleEntries`, `coordinationEvents`

**Migration:**
1. For each `scheduleItems` row, create `scheduleEntries` with parsed temporal fields
2. `day: "Monday"` + `time: "9:00 AM"` → `startsAt`/`endsAt` epoch values (use network timezone)
3. Add coordination event logging to handler outreach step

**Exit criteria:**
- All schedule items migrated with valid temporal fields
- Coverage window queries work (e.g., "who's scheduled between 2pm-6pm Tuesday?")
- Handler logs coordination events for outreach

### 6.6 Phase 5: Training Pipeline

**Add tables:** `trainingInteractions`, `trainingPatterns`, `trainingProposals`

**Deploy:**
1. Nightly cron: create `trainingInteractions` from unscored `messages`
2. Nightly cron: score unscored `trainingInteractions` via Opus
3. Weekly cron: extract patterns from scored interactions
4. Manual: review patterns, generate proposals

**Exit criteria:**
- Scoring pipeline produces scores for all interactions
- Scores are reasonable (manual review of 20 scored interactions)
- Pattern extraction identifies at least 2-3 meaningful patterns from pilot data

### 6.7 Phase 6: Cleanup

**Remove:**
- `familyContext` table (replaced by structured queries)
- `timelineEvents` table (replaced by `messages`)
- `conversations` table (replaced by `messages`)
- Old `members` table (replaced by `persons` + `memberships`)
- Dual-write code paths

**Exit criteria:**
- Schema has no unused tables
- All handler code references new tables only
- All tests pass against new schema

### 6.8 Breaking Changes & Backward Compatibility

**During migration (Phases 1-5):** Old tables remain. Handler writes to both old and new. Reads migrate one step at a time. No breaking changes to external interfaces (Linq webhook contract unchanged).

**At cleanup (Phase 6):** Breaking change for any code reading old tables directly. Mitigated by:
1. No external consumers — only our handler reads the DB
2. Seed scripts update in Phase 1
3. Tests update as each phase lands

**Rollback strategy:** Each phase is a separate commit/deployment. If Phase N breaks, revert to Phase N-1. Dual-write during Phases 1-4 means old tables are always current.

---

## Section 7: Open Questions (Collected)

### Data Model

| ID | Question | Section | Impact |
|----|----------|---------|--------|
| REVIEW-1 | chatId placement: memberships vs. persons | 2.1 | Determines multi-network message routing |
| REVIEW-2 | policyPack: string reference vs. inline object | 2.2 | Schema flexibility vs. query simplicity |
| REVIEW-4 | Temporal representation: epoch ms vs. ISO 8601 | 2.4 | Affects all temporal queries |
| REVIEW-5 | Decision trace storage: full vs. tiered vs. TTL | 2.6 | Storage costs, query patterns |

### Runtime

| ID | Question | Section | Impact |
|----|----------|---------|--------|
| REVIEW-3 | Session outcome: model-assessed vs. post-hoc | 2.3 | Training signal quality |
| REVIEW-6 | Context cache during migration | 3.2 | Latency vs. complexity trade-off |
| REVIEW-7 | Scheduled messages: Convex crons vs. external | 3.3 | Infra complexity |
| REVIEW-8 | AgentResponse extension vs. post-processing | 3.4 | Contract stability |

### Training

| ID | Question | Section | Impact |
|----|----------|---------|--------|
| REVIEW-9 | Scoring pipeline: Convex cron vs. external | 4.3 | Infra complexity |
| REVIEW-10 | Scoring scope: conversations vs. + coordination | 4.4 | Evaluation rubric design |
| REVIEW-11 | Training interaction snapshot TTL | 4.5 | Storage costs |
| REVIEW-12 | Evaluator-generated rewrites | 4.5 | Training signal quality vs. cost |
| REVIEW-13 | Privacy/anonymization for training data | 4.5 | Compliance requirement |

### What This RFC Does NOT Answer

- **Fine-tuning strategy:** Whether to fine-tune a model vs. improve prompts. This RFC builds the data infrastructure — the "tune vs. prompt" decision comes after we have scored data.
- **Multi-model training:** Whether training signals from Haiku interactions apply to Sonnet behavior. Likely yes for voice/safety, no for reasoning.
- **Network Health Score computation:** The exact NHS formula. This RFC provides the data (coverage windows, gap events, handoffs) — the score formula is a product decision.
- **Agency/platform integration:** How agency adapters connect. This RFC models the network types — adapter protocols are a separate RFC.
- **Pricing/billing:** How training pipeline costs translate to per-family pricing.

---

## References

- ADR-001: CareSupport V2 Migration Strategy (`docs/adr/001-v2-migration.md`)
- CareSupport Product Strategy (`CLAUDE.md` sections 1-16)
- Current schema: `convex/schema.ts`
- Handler pipeline: `convex/handler.ts`
- Context materialization: `convex/familyContext.ts`
- Pipeline types: `convex/lib/pipeline/types.ts`
- CareRouter: `convex/lib/pipeline/careRouter.ts`
- Prompt builder: `convex/lib/pipeline/promptBuilder.ts`
- Role filter: `convex/lib/enforcement/roleFilter.ts`
- Prompt content: `convex/lib/promptContent.ts`
